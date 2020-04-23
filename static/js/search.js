function createImage(consumable) {
    let img = document.createElement("img");
    let src = "/img/default-product.jpg";
    if (consumable.front !== "") {
        src = consumable.front;
    }
    img.src = src;
    img.alt = consumable.name;
    img.title = consumable.name;
    img.classList.add("materialboxed");
    img.setAttribute("data-caption", consumable.name);
    // TODO Materialbox: Make init workding
    M.Materialbox.init([img], {});
    return img
}

function addSearched(elt) {
    if (consumable === undefined) { return; }
    console.log("addSearched", consumable);
    // for easier later use (showConsumable)
    var consumable = {
        ID: consumable.consumable.ID,
        consumable: elt,
        list_id: Number(getCookie("ListID")),
        name: consumable,
        done: false,
        erased: false,
        mode: "searched",
    }

    insertLocalStorage(consumable, "consumables");
    POST("/list/add/consumable", consumable, function(event) {
        var json = JSON.parse(localStorage.getItem("consumables"));
        if (json === null) { return; };
        json.forEach(function(element) {
            if (element.ID === consumable.consumable.ID) {
                element.ID = event.ID
            }
        });
        localStorage.setItem("consumables", JSON.stringify(json));
    })
    window.history.back();
}

function displaySearchResult(consumable) {
    if (!"content" in document.createElement("template") ||
        consumable === undefined || consumable.consumable.mode === "sample" ||
        consumable.consumable.name === "") { return; }
    var template = document.querySelector("#consumable");
    var clone = document.importNode(template.content, true);
    var td = clone.querySelectorAll(".col-item");
    var row = clone.querySelector(".row");
    var addToList = clone.querySelector(".addBtn");
    var tableTD = clone.querySelectorAll(".item-info");
    row.id = consumable.consumable.ID
    td[0].appendChild(createImage(consumable.consumable));
    tableTD[0].innerHTML = consumable.consumable.name;
    tableTD[1].innerHTML = consumable.stock.pack_price / 100 + " €/Kg";
    tableTD[2].innerHTML = consumable.seller // UTILISER QUAND LES PRODUITS AURONTS UN VRAI VENDEUR -> consumable.store.name;
    // tableTD[3].innerHTML =  A REMPLIR EN FONCTION DES VIGNETTES CRITERES DU PRODUITS;
    tableTD[4].innerHTML = consumable.stock.pack_price + " €";
    addToList.addEventListener("click", function(event) {
        addSearched(consumable);
         if( typeof( addSearched(consumable) ) == undefined ){
            console.log("La fonction existe");
        } else {
            console.log("La fonction n'existe pas");
        }
    });
    document.querySelector("#consumables").appendChild(clone);   

}

function clearSearchResult() {
    var lists = document.querySelector("#consumables");
    while (lists.firstChild) {
        lists.removeChild(lists.firstChild);
    }
}

function search(element) {
    return function(e) {
        showLoadingGif(true)
        getTargetPosition();
        POST("/consumable/get", {
            query: element.value,
            latitude: Number(getCookie("posLat")),
            longitude: Number(getCookie("posLon")),
            accuracy: Number(getCookie("posAcc"))
        }, function(e) {
            clearSearchResult();
            e.forEach(displaySearchResult);
            showLoadingGif(false)
        }, function(e) {
            showLoadingGif(false)
        });
    }
}

function addPersonnal(value) {
    if (value === undefined) { return; }
    var uuid = getNewUID();
    var consumable = {
        ID: uuid,
        list_id: Number(getCookie("ListID")),
        name: value,
        done: false,
        erased: false,
        mode: "personnal",
    }

    insertLocalStorage(consumable, "consumables");
    POST("/list/add/personnal", consumable, function(event) {
        var json = JSON.parse(localStorage.getItem("consumables"));
        if (json === null) { return; };
        json.forEach(function(element) {
            if (element.ID === consumable.ID) {
                element.ID = event.ID
            }
        });
        localStorage.setItem("consumables", JSON.stringify(json));
    })
    window.history.back();
}

function fillAutoComplete() {
    GET("/json/autocomplete_data.json", function(data) {
        M.Autocomplete.init(document.querySelectorAll('.autocomplete'), { data });
    });
}

window.addEventListener("DOMContentLoaded", function() {
    if (!isTokenValid(getCookie("Token"))) {
        window.location.replace("/login.html");
    }
    var elems = document.getElementById("search-input");
    if (location.search !== "") {
        log("location.search=" + location.search.substring(1));
        elems.value = location.search.substring(3);
        document.getElementById("search-input-label").classList.add("active");
        search(elems)();
    }
    var addBtn = document.getElementById("add-item");
    addBtn.addEventListener("click", function(e) {
        addPersonnal(elems.value);
    });
    fillAutoComplete();
    elems.addEventListener("input", search(elems));
    elems.focus();
    elems.select();
    elems.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            addPersonnal(elems.value);
        }
    });
    document.getElementById("nav-back").addEventListener("click", function(e) {
        window.history.back();
    });
});