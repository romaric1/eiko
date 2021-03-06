package misc

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/eiko-team/eiko/misc/data"
	"github.com/eiko-team/eiko/misc/hash"
	"github.com/eiko-team/eiko/misc/log"
	"github.com/eiko-team/eiko/misc/structures"

	jwt "github.com/dgrijalva/jwt-go"
)

var (
	// TokensKey is the secret key for all tokens.
	// warning: On server reboot, all token are invalidated
	TokensKey = []byte(hash.GenerateKey(666))

	// ExpToken number of days before the token expire
	ExpToken = time.Duration(14)

	// Logger used to log output
	Logger = log.New(os.Stdout, "Misc: ", log.Ldate|log.Ltime|log.Lshortfile)
)

// ParseJSON generic function to parse request body, extract it's content and
// fill the struct
func ParseJSON(r *http.Request, v interface{}) error {
	if r == nil || r.Body == nil {
		return fmt.Errorf("No Body")
	}

	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

// DumpRequest return the request in a string format
func DumpRequest(r *http.Request) string {
	requestDump, err := httputil.DumpRequest(r, true)
	if err != nil {
		Logger.Println(err)
	}
	return string(requestDump)
}

// LogRequest logs a *http.Request using the Logger
func LogRequest(r *http.Request) {
	if r == nil {
		return
	}
	Logger.Println(DumpRequest(r))
}

// UserToToken convert the user information to a valid token
func UserToToken(u structures.User) (string, error) {
	return jwt.NewWithClaims(jwt.GetSigningMethod("HS512"), jwt.MapClaims{
		"email": u.Email,
		"exp":   time.Now().Add(time.Hour * 24 * ExpToken).Unix(),
		"iat":   time.Now().Unix(),
		// "nbf":   time.Now().Add(time.Second * 1).Unix(),
	}).SignedString(TokensKey)
}

// TokenToUser convert the Token to user's information
func TokenToUser(d data.Data, tokenStr string) (structures.User, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Bad method: %v", token.Header["alg"])
		}
		return TokensKey, nil
	})
	if err != nil {
		return structures.User{}, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return d.GetUser(claims["email"].(string))
	}
	return structures.User{}, err
}

// ValidateToken check if the token is valid
func ValidateToken(d data.Data, token string) bool {
	_, err := TokenToUser(d, token)
	return err == nil
}

// Atoi is a wrapper around strconv.Atoi
func Atoi(value string) (int, error) {
	i64, err := strconv.ParseInt(value, 10, 0)
	return int(i64), err
}

// SplitString return the string s splited with the separator sep and the size
// of result is at least lenRes.
func SplitString(s, sep string, lenRes int) []string {
	var res []string
	for res = strings.Split(s, sep); len(res) < lenRes; {
		res = append(res, "")
	}
	return res
}

// NormalizeName is used to normalize a name
func NormalizeName(name string) string {
	return strings.ToLower(strings.Replace(name, "%20", " ", -1))
}

// NormalizeConsumable is used to normalize a consumable
func NormalizeConsumable(c structures.Consumable) structures.Consumable {
	c.Name = NormalizeName(c.Name)
	return c
}

// NormalizeQuery is used to normalize a query
func NormalizeQuery(q structures.Query) structures.Query {
	q.Query = NormalizeName(q.Query)
	if q.Limit < 1 || q.Limit > 20 {
		q.Limit = 20
	}
	return q
}
