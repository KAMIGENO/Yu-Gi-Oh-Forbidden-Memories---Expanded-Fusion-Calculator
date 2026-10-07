/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionCalc.js
 * ------------------------------------------------------------
 *
 * Handles the 800-slot Fusion Calculator.
 * Only the currently visible 10 inputs exist in the DOM;
 * all 800 card selections are stored in handCards.
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

var outputLeft = document.getElementById("outputarealeft");
var outputRight = document.getElementById("outputarearight");
var handInputGroup = document.getElementById("hand-input-group");

var HAND_SIZE = 800;
var PAGE_SIZE = 10;

var handCards = new Array(HAND_SIZE).fill(null);
var currentPage = 1;
var totalPages = Math.ceil(HAND_SIZE / PAGE_SIZE);

var allCards = card_db().get();
var cardNames = allCards.map(function (card) {
    return card.Name;
});


/*
 * ------------------------------------------------------------
 * 2. CARD LOOKUPS
 *
 * Cache cards by name and ID so large hands do not repeatedly
 * query Taffy for the same information.
 * ------------------------------------------------------------
 */

var cardByName = {};
var cardById = {};


allCards.forEach(function (card) {

        cardByName[card.Name.toLowerCase()] = card;
        cardById[card.Id] = card;

    });


function getCardByName(cardname) {

    if (!cardname) {
        return null;
    }

    return cardByName[cardname.toLowerCase()] || null;

}


function getCardById(id) {

    return cardById[id] || null;

}


/*
 * ------------------------------------------------------------
 * 3. FUSION AND EQUIP LOOKUPS
 *
 * Build O(1) pair lookups for the 79,800 possible pairs in a
 * completely filled 800-card hand.
 * ------------------------------------------------------------
 */

var fusionLookup = {};
var glitchFusionLookup = {};
var equipLookup = {};
var ritualDefinitions = [];
var fieldCardIds = {};


fieldList.forEach(function (definition) {
    fieldCardIds[definition.CardId] = true;
});


fusionsList.forEach(function (fusionList, cardId) {

    if (!fusionList) {
        return;
    }


    fusionList.forEach(function (fusion) {

        var key = cardId + ":" + fusion.card;
        var reverseKey = fusion.card + ":" + cardId;
        var resultCard = getCardById(fusion.result);

        if (!resultCard) {
            return;
        }


        fusionLookup[key] = resultCard;
        fusionLookup[reverseKey] = resultCard;

    });

});


glitchFusions.forEach(function (fusion) {

    var card1 = getCardByName(fusion.card1);
    var card2 = getCardByName(fusion.card2);
    var resultCard = getCardByName(fusion.result);

    if (!card1 || !card2 || !resultCard) {
        return;
    }


    var key = card1.Id + ":" + card2.Id;
    var reverseKey = card2.Id + ":" + card1.Id;

    glitchFusionLookup[key] = resultCard;
    glitchFusionLookup[reverseKey] = resultCard;

});


equipsList.forEach(function (targetIds, equipId) {

    if (!targetIds) {
        return;
    }


    targetIds.forEach(function (targetId) {

        var key = equipId + ":" + targetId;
        equipLookup[key] = true;

    });

});


ritualsList.forEach(function (ritualList) {

    if (!ritualList) {
        return;
    }


    ritualList.forEach(function (ritual) {

        if (!ritual) {
            return;
        }


        var ritualCard = getCardByName(ritual.ritualCard);
        var card1 = getCardByName(ritual.card1);
        var card2 = getCardByName(ritual.card2);
        var card3 = getCardByName(ritual.card3);
        var result = getCardByName(ritual.result);

        if (!ritualCard || !card1 || !card2 || !card3 || !result) {
            return;
        }


        ritualDefinitions.push({
            ritualCard: ritualCard,
            card1: card1,
            card2: card2,
            card3: card3,
            result: result
        });

    });

});


/*
 * ------------------------------------------------------------
 * 4. CARD DISPLAY HELPERS
 * ------------------------------------------------------------
 */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


function isMonster(card) {
    return card && card.Type < 20;
}


function formatCardId(id) {
    return "#" + String(id).padStart(3, "0");
}


var guardianStarSymbols = {
    "Sun": "☉",
    "Mercury": "☿",
    "Venus": "♀",
    "Moon": "☾",
    "Mars": "♂",
    "Jupiter": "♃",
    "Saturn": "♄",
    "Uranus": "⛢",
    "Neptune": "♆",
    "Pluto": "♇"
};


function formatGuardianStars(card) {

    var starA = starNames[card.GuardianStarA] || "";
    var starB = starNames[card.GuardianStarB] || "";

    var symbolA = guardianStarSymbols[starA] || "";
    var symbolB = guardianStarSymbols[starB] || "";

    return (
        symbolA +
        " " +
        starA +
        ", " +
        symbolB +
        " " +
        starB
    );

}


function getCardTypeName(card) {
    return cardTypes[card.Type] || "Unknown";
}


function formatCardDetails(card) {

    if (!card) {
        return "";
    }


    var details =
        "Type: " +
        getCardTypeName(card);


    if (isMonster(card)) {

        details +=
            " — Guardian Stars: " +
            formatGuardianStars(card) +
            " — " +
            card.Attack +
            "A / " +
            card.Defense +
            "D";

    }


    return details;

}


function formatCardSummary(card) {

    if (!card) {
        return "";
    }


    var summary =
        formatCardId(card.Id) +
        " " +
        card.Name;


    if (isMonster(card)) {

        summary +=
            " (" +
            card.Attack +
            "/" +
            card.Defense +
            ")";

    }


    return summary;

}


function formatCardSummarySecondary(card) {

    if (!card) {
        return "";
    }


    var secondary =
        "Type: " +
        getCardTypeName(card);


    if (isMonster(card)) {

        secondary +=
            " — Guardian Stars: " +
            formatGuardianStars(card);

    }


    return secondary;

}


function formatBoldInputCard(card) {

    return (
        "<strong>" +
        escapeHTML(card.Name) +
        "</strong>" +
        " <span class='text-muted'>(" +
        escapeHTML(formatCardSummary(card)) +
        ")</span>"
    );

}


/*
 * ------------------------------------------------------------
 * 5. FUSION / EQUIP / RITUAL COMPUTATION
 * ------------------------------------------------------------
 */

function getFusionResult(cardA, cardB) {

    if (!cardA || !cardB) {
        return null;
    }


    var key = cardA.Id + ":" + cardB.Id;

    if (glitchFusionLookup[key]) {

        return {
            result: glitchFusionLookup[key],
            glitch: true
        };

    }


    if (fusionLookup[key]) {

        return {
            result: fusionLookup[key],
            glitch: false
        };

    }


    return null;

}


function buildFusionChains(cards) {

    var chains = [];
    var seenChains = {};


    function search(currentResult, remainingCards, path, containsGlitch) {

        for (var i = 0; i < remainingCards.length; i++) {

            var nextCard = remainingCards[i];
            var fusion = getFusionResult(currentResult, nextCard);

            if (!fusion) {
                continue;
            }


            var nextGlitch = containsGlitch || fusion.glitch;
            var nextPath = path.concat([nextCard]);
            var nextRemaining = remainingCards.slice(0, i).concat(remainingCards.slice(i + 1));

            var chainKey = nextPath
                .map(function (card) {
                    return card.Id;
                })
                .sort(function (a, b) {
                    return a - b;
                })
                .join(":");

            chainKey += "->" + fusion.result.Id;


            if (!seenChains[chainKey]) {

                seenChains[chainKey] = true;

                chains.push({
                    path: nextPath,
                    result: fusion.result,
                    glitch: nextGlitch
                });

            }


            search(
                fusion.result,
                nextRemaining,
                nextPath,
                nextGlitch
            );

        }

    }


    for (var i = 0; i < cards.length; i++) {

        for (var j = i + 1; j < cards.length; j++) {

            var first = cards[i];
            var second = cards[j];
            var fusion = getFusionResult(first, second);

            if (!fusion) {
                continue;
            }


            var remaining = cards
                .slice(0, i)
                .concat(cards.slice(i + 1, j))
                .concat(cards.slice(j + 1));

            var initialPath = [first, second];

            var chainKey = [first.Id, second.Id]
                .sort(function (a, b) {
                    return a - b;
                })
                .join(":");

            chainKey += "->" + fusion.result.Id;


            if (!seenChains[chainKey]) {

                seenChains[chainKey] = true;

                chains.push({
                    path: initialPath,
                    result: fusion.result,
                    glitch: fusion.glitch
                });

            }


            search(
                fusion.result,
                remaining,
                initialPath,
                fusion.glitch
            );

        }

    }


    return chains;

}


function buildEquipTargets(cards) {

    var entries = [];
    var seenEntries = {};


    for (var i = 0; i < cards.length; i++) {

        for (var j = 0; j < cards.length; j++) {

            if (i === j) {
                continue;
            }


            var equipCard = cards[i];
            var monsterCard = cards[j];

            if (!isMonster(monsterCard)) {
                continue;
            }


            var key = equipCard.Id + ":" + monsterCard.Id;

            if (equipLookup[key] && !seenEntries[key]) {

                seenEntries[key] = true;

                entries.push({
                    equip: equipCard,
                    monster: monsterCard
                });

            }

        }

    }


    return entries;

}


function findRituals(cards) {

    var availableCounts = {};


    cards.forEach(function (card) {

        availableCounts[card.Id] =
            (availableCounts[card.Id] || 0) + 1;

    });


    var validRituals = [];
    var seenRituals = {};


    ritualDefinitions.forEach(function (ritual) {

        var requiredCounts = {};


        [
            ritual.ritualCard.Id,
            ritual.card1.Id,
            ritual.card2.Id,
            ritual.card3.Id
        ].forEach(function (cardId) {

            requiredCounts[cardId] =
                (requiredCounts[cardId] || 0) + 1;

        });


        var canPerform = Object.keys(requiredCounts).every(function (cardId) {
            return (availableCounts[cardId] || 0) >= requiredCounts[cardId];
        });


        if (canPerform) {

            var ritualKey = [
                ritual.ritualCard.Id,
                ritual.card1.Id,
                ritual.card2.Id,
                ritual.card3.Id
            ].sort(function (a, b) {
                return a - b;
            }).join(":");

            ritualKey += "->" + ritual.result.Id;


            if (!seenRituals[ritualKey]) {

                seenRituals[ritualKey] = true;
                validRituals.push(ritual);

            }

        }

    });


    return validRituals;

}


/*
 * ------------------------------------------------------------
 * 6. RESULT RENDERING
 * ------------------------------------------------------------
 */

function fusionChainsToHTML(chains) {

    return chains
        .slice()
        .sort(function (a, b) {

            if (b.path.length !== a.path.length) {
                return b.path.length - a.path.length;
            }

            return b.result.Attack - a.result.Attack;

        })
        .map(function (chain) {

            var glitchHeader = chain.glitch
                ? "<div class='fusion-glitch-label text-warning font-weight-bold'>Glitch Fusion</div>"
                : "";

            var steps = [];
            var currentResult = chain.path[0];


            for (var i = 1; i < chain.path.length; i++) {

                var nextCard = chain.path[i];
                var nextFusion = getFusionResult(currentResult, nextCard);
                var isFinalStep = i === chain.path.length - 1;

                var stepHTML =
                    "<div class='fusion-chain-step" +
                    (i > 1 ? " fusion-chain-followup" : "") +
                    "'>" +
                    formatBoldInputCard(currentResult) +
                    " + " +
                    formatBoldInputCard(nextCard);


                if (!isFinalStep) {

                    stepHTML +=
                        " = " +
                        escapeHTML(formatCardSummary(nextFusion.result)) +
                        "<div class='fusion-card-summary-secondary text-muted'>" +
                        escapeHTML(formatCardSummarySecondary(nextFusion.result)) +
                        "</div>";

                }

                stepHTML += "</div>";
                steps.push(stepHTML);

                currentResult = nextFusion.result;

            }


            var resultHTML =
                "<div><strong>RESULT: " +
                escapeHTML(formatCardId(chain.result.Id) + " " + chain.result.Name) +
                "</strong><br>" +
                escapeHTML("Type: " + getCardTypeName(chain.result)) +
                "<br>Guardian Stars: " +
                escapeHTML(formatGuardianStars(chain.result)) +
                "<br>" +
                escapeHTML(chain.result.Attack) +
                "A / " +
                escapeHTML(chain.result.Defense) +
                "D</div>";


            return (
                "<div class='result-div fusion-chain-result'>" +
                glitchHeader +
                steps.join("") +
                resultHTML +
                "</div>"
            );

        })
        .join("\n");

}


function equipsToHTML(equipEntries) {

    return equipEntries
        .slice()
        .sort(function (a, b) {
            return a.equip.Id - b.equip.Id;
        })
        .map(function (entry) {

            return (
                "<div class='result-div equip-result'>" +
                "<div><strong>Equip Card:</strong> " +
                formatBoldInputCard(entry.equip) +
                "</div>" +
                "<div class='fusion-chain-step fusion-chain-followup' style='margin-left: 2rem;'><strong>Equip Target:</strong> " +
                formatBoldInputCard(entry.monster) +
                "</div>" +
                "<div><strong>RESULT: " +
                escapeHTML(formatCardId(entry.monster.Id) + " " + entry.monster.Name) +
                "</strong><br>" +
                escapeHTML("Type: " + getCardTypeName(entry.monster)) +
                "<br>Guardian Stars: " +
                escapeHTML(formatGuardianStars(entry.monster)) +
                "<br>" +
                escapeHTML(entry.monster.Attack + 500) +
                "A / " +
                escapeHTML(entry.monster.Defense + 500) +
                "D <span class='text-success font-weight-bold'>(+500 / +500)</span></div>" +
                "</div>"
            );

        })
        .join("\n");

}


function ritualsToHTML(ritualList) {

    return ritualList
        .slice()
        .sort(function (a, b) {
            return a.result.Id - b.result.Id;
        })
        .map(function (ritual) {

            return (
                "<div class='result-div ritual-result'>" +
                "<div><strong>Ritual:</strong> " +
                formatBoldInputCard(ritual.ritualCard) +
                "</div>" +
                "<div class='fusion-chain-step fusion-chain-followup' style='margin-left: 2rem;'><strong>Material:</strong> " +
                formatBoldInputCard(ritual.card1) +
                "</div>" +
                "<div class='fusion-chain-step fusion-chain-followup' style='margin-left: 2rem;'><strong>Material:</strong> " +
                formatBoldInputCard(ritual.card2) +
                "</div>" +
                "<div class='fusion-chain-step fusion-chain-followup' style='margin-left: 2rem;'><strong>Material:</strong> " +
                formatBoldInputCard(ritual.card3) +
                "</div>" +
                "<div><strong>RESULT: " +
                escapeHTML(formatCardId(ritual.result.Id) + " " + ritual.result.Name) +
                "</strong><br>" +
                escapeHTML("Type: " + getCardTypeName(ritual.result)) +
                (isMonster(ritual.result)
                    ? "<br>Guardian Stars: " +
                      escapeHTML(formatGuardianStars(ritual.result)) +
                      "<br>" +
                      escapeHTML(ritual.result.Attack) +
                      "A / " +
                      escapeHTML(ritual.result.Defense) +
                      "D"
                    : "") +
                "</div>" +
                "</div>"
            );

        })
        .join("\n");

}


function fieldsToHTML(monsters, chains) {

    var allMonsters = monsters.slice();
    var seenCardIds = {};


    monsters.forEach(function (card) {
        seenCardIds[card.Id] = true;
    });


    chains.forEach(function (chain) {

        if (isMonster(chain.result) && !seenCardIds[chain.result.Id]) {

            seenCardIds[chain.result.Id] = true;
            allMonsters.push(chain.result);

        }

    });


    if (allMonsters.length === 0) {
        return "";
    }


    var fieldCards = fieldList
        .map(function (definition) {
            return getCardById(definition.CardId);
        })
        .filter(function (card) {
            return card !== null;
        });


    return fieldCards
        .map(function (fieldCard) {

            var definition = fieldList.find(function (item) {
                return item.CardId === fieldCard.Id;
            });

            if (!definition) {
                return "";
            }


            var monsterRows = allMonsters
                .map(function (monster) {

                    var bonus = 0;


                    if (definition.PositiveTypes.indexOf(monster.Type) !== -1) {
                        bonus = definition.Bonus;
                    } else if (definition.NegativeTypes.indexOf(monster.Type) !== -1) {
                        bonus = -definition.Bonus;
                    }

                    if (bonus === 0) {
                        return "";
                    }


                    var attackAfter = Math.max(0, monster.Attack + bonus);
                    var defenseAfter = Math.max(0, monster.Defense + bonus);
                    var bonusClass = bonus > 0 ? "field-positive" : "field-negative";
                    var bonusText = (bonus > 0 ? "+" : "") + bonus;

                    return (
                        "<div class='fusion-chain-step fusion-chain-followup' style='margin-left: 2rem;'>" +
                        "<strong>Monster:</strong> " +
                        formatBoldInputCard(monster) +
                        "<br>" +
                        "<strong>RESULT: " +
                        escapeHTML(formatCardId(monster.Id) + " " + monster.Name) +
                        "</strong><br>" +
                        escapeHTML("Type: " + getCardTypeName(monster)) +
                        "<br>Guardian Stars: " +
                        escapeHTML(formatGuardianStars(monster)) +
                        "<br>" +
                        escapeHTML(attackAfter) +
                        "A / " +
                        escapeHTML(defenseAfter) +
                        "D " +
                        "<span class='" +
                        bonusClass +
                        " font-weight-bold'>(" +
                        bonusText +
                        " / " +
                        bonusText +
                        ")</span>" +
                        "</div>"
                    );

                })
                .filter(function (row) {
                    return row !== "";
                });


            if (monsterRows.length === 0) {
                return "";
            }


            return (
                "<div class='result-div field-result'>" +
                "<div><strong>Field Card:</strong> " +
                formatBoldInputCard(fieldCard) +
                "</div>" +
                monsterRows.join("") +
                "</div>"
            );

        })
        .filter(function (block) {
            return block !== "";
        })
        .join("\n");

}


function findFusions() {

    var cards = handCards.filter(function (card) {
        return card !== null;
    });


    var chains = buildFusionChains(cards);
    var equipEntries = buildEquipTargets(cards);


    var rituals = findRituals(cards);
    var fields = fieldsToHTML(
        cards.filter(function (card) {
            return isMonster(card);
        }),
        chains
    );


    outputLeft.innerHTML =
        "<section class='fusion-calculator-output-section output-left-section'>" +
        "<h2 class='text-left'>Fusions:</h2>" +
        fusionChainsToHTML(chains) +
        "</section>" +
        "<section class='fusion-calculator-output-section output-left-section'>" +
        "<h2 class='text-left'>Rituals:</h2>" +
        ritualsToHTML(rituals) +
        "</section>";


    outputRight.innerHTML =
        "<section class='fusion-calculator-output-section output-right-section'>" +
        "<h2 class='text-left'>Equips:</h2>" +
        equipsToHTML(equipEntries) +
        "</section>" +
        "<section class='fusion-calculator-output-section output-right-section'>" +
        "<h2 class='text-left'>Fields:</h2>" +
        fields +
        "</section>";

}


/*
 * ------------------------------------------------------------
 * 7. INPUT / CARD DISPLAY
 * ------------------------------------------------------------
 */

function updateCardInfo(input, info) {

    var card = getCardByName(input.value);


    if (!card) {

        info.textContent =
            input.value === ""
                ? ""
                : "Invalid card name";

        return;

    }


    if (isMonster(card)) {

        info.textContent =
            formatCardDetails(card);

        return;

    }


    var typeLabel = cardTypes[card.Type];


    if (card.Type === 20) {
        typeLabel = fieldCardIds[card.Id]
            ? "Magic (Field)"
            : "Magic (Effect)";
    }


    info.textContent = "Type: " + typeLabel;

}


function createInput(slotNumber) {

    var wrapper = document.createElement("div");
    wrapper.className = "hand-slot";


    var number = document.createElement("span");
    number.className = "hand-slot-number";

    var paddedSlotNumber =
        slotNumber < 10
            ? "00" + slotNumber
            : slotNumber < 100
                ? "0" + slotNumber
                : String(slotNumber);

    number.textContent = paddedSlotNumber + ". ";


    var input = document.createElement("input");
    input.type = "text";
    input.id = "hand" + slotNumber;
    input.className = "hand-card-input";
    input.autocomplete = "off";
    input.placeholder = " Search card name...";


    var info = document.createElement("span");
    info.id = "hand" + slotNumber + "-info";
    info.className = "hand-card-info";


    wrapper.appendChild(number);
    wrapper.appendChild(input);
    wrapper.appendChild(info);


    return {
        wrapper: wrapper,
        input: input,
        info: info
    };

}


/*
 * ------------------------------------------------------------
 * 8. PAGINATION
 * ------------------------------------------------------------
 */

function renderPage() {

    handInputGroup.innerHTML = "";


    var start = (currentPage - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, HAND_SIZE);


    for (var slot = start; slot < end; slot++) {

        var slotNumber = slot + 1;
        var elements = createInput(slotNumber);


        handInputGroup.appendChild(elements.wrapper);


        var card = handCards[slot];


        if (card) {

            elements.input.value = card.Name;
            updateCardInfo(elements.input, elements.info);

        }


        initializeAutocomplete(
            elements.input,
            elements.info,
            slot
        );

    }


    updatePagination();

}


function initializeAutocomplete(input, info, slotIndex) {

    var completion = new Awesomplete(input, {
        list: cardNames,
        autoFirst: true,
        filter: Awesomplete.FILTER_STARTSWITH
    });


    input.addEventListener("input", function () {

        if (input.value.trim() === "") {
            handCards[slotIndex] = null;
            updateCardInfo(input, info);
            findFusions();
        }

    });


    input.addEventListener("change", function () {

        completion.select();

        handCards[slotIndex] = getCardByName(input.value);

        updateCardInfo(input, info);

        findFusions();

    });


    input.addEventListener("awesomplete-selectcomplete", function () {

        handCards[slotIndex] = getCardByName(input.value);

        updateCardInfo(input, info);

        findFusions();

    });

}


function updatePagination() {

    var pageLabel = document.getElementById("hand-page-label");
    var previousButton = document.getElementById("hand-prev");
    var nextButton = document.getElementById("hand-next");


    var startSlot = (currentPage - 1) * PAGE_SIZE + 1;
    var endSlot = Math.min(currentPage * PAGE_SIZE, HAND_SIZE);

    var paddedStartSlot = String(startSlot).padStart(3, "0");
    var paddedEndSlot = String(endSlot).padStart(3, "0");

    pageLabel.textContent =
        "Slots " +
        paddedStartSlot +
        "–" +
        paddedEndSlot +
        " of " +
        HAND_SIZE;


    previousButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;

}


function changePage(page) {

    if (page < 1 || page > totalPages) {
        return;
    }


    currentPage = page;
    renderPage();


    var firstInput = document.getElementById(
        "hand" + ((currentPage - 1) * PAGE_SIZE + 1)
    );

    if (firstInput) {
        firstInput.focus();
    }

}


/*
 * ------------------------------------------------------------
 * 9. BUTTON HANDLERS
 * ------------------------------------------------------------
 */

document.getElementById("hand-prev").addEventListener("click", function () {
    changePage(currentPage - 1);
});


document.getElementById("hand-next").addEventListener("click", function () {
    changePage(currentPage + 1);
});


document.getElementById("resetBtn").addEventListener("click", function () {

    handCards = new Array(HAND_SIZE).fill(null);
    currentPage = 1;

    renderPage();

    outputLeft.innerHTML = "";
    outputRight.innerHTML = "";

});


/*
 * ------------------------------------------------------------
 * 10. INITIAL RENDER
 * ------------------------------------------------------------
 */

renderPage();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
