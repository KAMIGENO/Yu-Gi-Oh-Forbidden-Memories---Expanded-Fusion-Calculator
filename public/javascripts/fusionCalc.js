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


function getCardById(cardId) {
    return cardById[cardId] || null;
}


/*
 * ------------------------------------------------------------
 * 3. GLITCH FUSION LOOKUPS
 * ------------------------------------------------------------
 */

var glitchFusionDefinitions = glitchFusions.map(function (fusion) {

    return {
        card1: getCardByName(fusion.card1),
        card2: getCardByName(fusion.card2),
        result: getCardByName(fusion.result),
        glitch: true
    };

}).filter(function (fusion) {

    return fusion.card1 && fusion.card2 && fusion.result;

});


var glitchFusionsByCardId = {};


glitchFusionDefinitions.forEach(function (fusion) {

    if (!glitchFusionsByCardId[fusion.card1.Id]) {
        glitchFusionsByCardId[fusion.card1.Id] = [];
    }

    if (!glitchFusionsByCardId[fusion.card2.Id]) {
        glitchFusionsByCardId[fusion.card2.Id] = [];
    }

    glitchFusionsByCardId[fusion.card1.Id].push(fusion);
    glitchFusionsByCardId[fusion.card2.Id].push(fusion);

});


/*
 * ------------------------------------------------------------
 * 4. RITUAL LOOKUPS
 * ------------------------------------------------------------
 */

var ritualDefinitions = [];


ritualsList.forEach(function (ritualList) {

    if (!ritualList) {
        return;
    }

    ritualList.forEach(function (ritual) {

        if (!ritual) {
            return;
        }

        ritualDefinitions.push(ritual);

    });

});


/*
 * ------------------------------------------------------------
 * 5. CARD DISPLAY HELPERS
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
    return !!card && card.Type < 20;
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


function getCardSummaryText(card) {

    if (!card) {
        return "";
    }

    if (isMonster(card)) {

        var stars = [
            guardianStarSymbols[types_and_stars.stars[card.GuardianStarA]],
            guardianStarSymbols[types_and_stars.stars[card.GuardianStarB]]
        ].filter(Boolean);

        var starDisplay = stars.length > 0 ? " [" + stars.join(" ") + "]" : "";

        return (
            formatCardId(card.Id) +
            " " +
            card.Name +
            " (" +
            card.Attack +
            "/" +
            card.Defense +
            ")" +
            starDisplay
        );

    }

    return formatCardId(card.Id) + " " + card.Name;

}


function getModelCardHTML(card, badgeHTML) {

    var attackDefenseDisplay = "";
    var starsDisplay = "";


    if (isMonster(card)) {

        attackDefenseDisplay =
            "<strong>ATK: </strong>" +
            card.Attack +
            "&emsp;<strong>DEF: </strong>" +
            card.Defense +
            "<br>";

        var stars = [
            guardianStarSymbols[types_and_stars.stars[card.GuardianStarA]],
            guardianStarSymbols[types_and_stars.stars[card.GuardianStarB]]
        ].filter(Boolean);

        if (stars.length > 0) {
            starsDisplay = " (" + stars.join(" ") + ")";
        }

    }


    return (
        "<div class=\"card border-dark\" style=\"width:100%; box-sizing:border-box;\">" +
            "<div class=\"card-body\">" +
                badgeHTML +
                "<h5 class=\"card-title text-main\">" +
                    formatCardId(card.Id) +
                    " " +
                    escapeHTML(card.Name) +
                "</h5>" +
                "<h6 class=\"card-subtitle mb-2 text-muted\">" +
                    escapeHTML(types_and_stars.types[card.Type]) +
                    escapeHTML(starsDisplay) +
                "</h6>" +
                "<p class=\"card-text\">" +
                    attackDefenseDisplay +
                    escapeHTML(card.Description).replace(/\r?\n/g, "<br>") +
                "</p>" +
            "</div>" +
        "</div>"
    );

}


/*
 * ------------------------------------------------------------
 * 6. RESULT RENDERING
 * ------------------------------------------------------------
 */

function resultsToHTML(fusions, resultHeader) {

    var groupedFusions = {};


    fusions.forEach(function (fusion) {

        if (!groupedFusions[fusion.result.Name]) {
            groupedFusions[fusion.result.Name] = [];
        }

        groupedFusions[fusion.result.Name].push(fusion);

    });


    var html =
        "<div class=\"fusion-calculator-output-section output-left-section\">" +
            "<h2 class=\"text-center my-4\">" +
                escapeHTML(resultHeader) +
            "</h2>";


    Object.keys(groupedFusions).forEach(function (resultName) {

        var group = groupedFusions[resultName];
        var resultCard = group[0].result;
        var hasGlitch = group.some(function (f) { return f.glitch; });

        var badge = hasGlitch
            ? "<div class=\"badge badge-warning mb-2 d-inline-block\">Glitch Fusion</div><br>"
            : "";

        html +=
            "<div class=\"result-div\">" +
                getModelCardHTML(resultCard, badge) +
                "<br>" +
                "<h6>Fusions:</h6>";

        group.forEach(function (fusion) {

            var glitchTag = fusion.glitch
                ? " <span class=\"badge badge-warning\">Glitch</span>"
                : "";

            html +=
                "<div style=\"text-align:left;\">" +
                    escapeHTML(fusion.card1.Name) +
                    " + " +
                    escapeHTML(fusion.card2.Name) +
                    " = " +
                    formatCardId(fusion.result.Id) +
                    " " +
                    escapeHTML(fusion.result.Name) +
                    glitchTag +
                "</div>";

        });

        html += "</div>";

    });


    html += "</div>";
    return html;

}


function createEquipStepNode(currentCard, currentSlot, remainingHand, visitedKeys) {

    var steps = [];
    var equips = equipsList[currentCard.Id] || [];


    remainingHand.forEach(function (item, index) {

        var equipCard = item.card;
        var isCompatible =
            equips.indexOf(equipCard.Id) !== -1 ||
            (equipsList[equipCard.Id] && equipsList[equipCard.Id].indexOf(currentCard.Id) !== -1);

        if (!isCompatible) {
            return;
        }


        var nextRemaining = remainingHand.slice(0, index).concat(remainingHand.slice(index + 1));
        var branchKey = currentCard.Id + "+E:" + equipCard.Id + "@" + item.slot;

        if (visitedKeys[branchKey]) {
            return;
        }

        visitedKeys[branchKey] = true;


        var step = {
            baseCard: currentCard,
            baseSlot: currentSlot,
            equipCard: equipCard,
            equipSlot: item.slot,
            resultCard: currentCard,
            nextSteps: []
        };


        step.nextSteps = createEquipStepNode(currentCard, currentSlot, nextRemaining, visitedKeys);
        steps.push(step);

    });


    return steps;

}


function renderEquipStep(step) {

    var html =
        "<div class=\"fusion-chain-step\">" +
            "Equip: " +
            escapeHTML(step.baseCard.Name) +
            " [Slot " +
            step.baseSlot +
            "] + " +
            escapeHTML(step.equipCard.Name) +
            " [Slot " +
            step.equipSlot +
            "]" +
        "</div>";


    if (step.nextSteps.length > 0) {

        html += "<div class=\"fusion-chain-followup\">";

        step.nextSteps.forEach(function (nextStep) {
            html += renderEquipStep(nextStep);
        });

        html += "</div>";

    }


    return html;

}


function createChainStepNode(currentCard, currentSlot, remainingHand, visitedKeys) {

    var steps = [];
    var standardFusions = fusionsList[currentCard.Id] || [];
    var glitchFusions = glitchFusionsByCardId[currentCard.Id] || [];


    remainingHand.forEach(function (item, index) {

        var otherCard = item.card;
        var otherSlot = item.slot;
        var fusionMatches = [];


        standardFusions.forEach(function (f) {

            if (f.card === otherCard.Id) {

                var res = getCardById(f.result);

                if (res) {
                    fusionMatches.push({ result: res, glitch: false });
                }

            }

        });


        glitchFusions.forEach(function (f) {

            var isMatch =
                (f.card1.Id === currentCard.Id && f.card2.Id === otherCard.Id) ||
                (f.card2.Id === currentCard.Id && f.card1.Id === otherCard.Id);

            if (isMatch) {
                fusionMatches.push({ result: f.result, glitch: true });
            }

        });


        fusionMatches.forEach(function (match) {

            var nextRemaining = remainingHand.slice(0, index).concat(remainingHand.slice(index + 1));
            var branchKey = currentCard.Id + "+" + otherCard.Id + "->" + match.result.Id;

            if (visitedKeys[branchKey]) {
                return;
            }

            visitedKeys[branchKey] = true;


            var step = {
                card1: currentCard,
                slot1: currentSlot,
                card2: otherCard,
                slot2: otherSlot,
                result: match.result,
                glitch: match.glitch,
                nextSteps: []
            };


            step.nextSteps = createChainStepNode(match.result, currentSlot, nextRemaining, visitedKeys);
            steps.push(step);

        });

    });


    return steps;

}


function renderChainStep(step) {

    var glitchTag = step.glitch ? " [Glitch]" : "";

    var html =
        "<div class=\"fusion-chain-step\">" +
            escapeHTML(step.card1.Name) +
            " [Slot " +
            step.slot1 +
            "] + " +
            escapeHTML(step.card2.Name) +
            " [Slot " +
            step.slot2 +
            "] = " +
            formatCardId(step.result.Id) +
            " " +
            escapeHTML(step.result.Name) +
            glitchTag +
        "</div>";


    if (step.nextSteps.length > 0) {

        html += "<div class=\"fusion-chain-followup\">";

        step.nextSteps.forEach(function (nextStep) {
            html += renderChainStep(nextStep);
        });

        html += "</div>";

    }


    return html;

}


function renderChainsHTML(chains) {

    if (!chains || chains.length === 0) {
        return "";
    }


    var html =
        "<div class=\"fusion-calculator-output-section output-right-section\">" +
            "<h2 class=\"text-center my-4\">Fusion Chains</h2>";


    chains.forEach(function (rootStep) {

        var badge = rootStep.glitch
            ? "<div class=\"badge badge-warning mb-2 d-inline-block\">Glitch Fusion</div><br>"
            : "";

        html +=
            "<div class=\"result-div\">" +
                getModelCardHTML(rootStep.result, badge) +
                "<br>" +
                "<h6>Chain Sequence:</h6>" +
                renderChainStep(rootStep) +
            "</div>";

    });


    html += "</div>";
    return html;

}


function renderEquipsHTML(equipChains) {

    if (!equipChains || equipChains.length === 0) {
        return "";
    }


    var html =
        "<div class=\"fusion-calculator-output-section output-right-section\">" +
            "<h2 class=\"text-center my-4\">Equip Possibilities</h2>";


    equipChains.forEach(function (rootStep) {

        html +=
            "<div class=\"result-div\">" +
                getModelCardHTML(rootStep.baseCard, "") +
                "<br>" +
                "<h6>Compatible Equips:</h6>" +
                renderEquipStep(rootStep) +
            "</div>";

    });


    html += "</div>";
    return html;

}


function renderRitualsHTML(rituals) {

    if (!rituals || rituals.length === 0) {
        return "";
    }


    var html =
        "<div class=\"fusion-calculator-output-section output-left-section\">" +
            "<h2 class=\"text-center my-4\">Rituals</h2>";


    rituals.forEach(function (ritual) {

        html +=
            "<div class=\"result-div ritual-result\">" +
                getModelCardHTML(ritual.resultCard, "<div class=\"badge badge-primary mb-2 d-inline-block\">Ritual Summon</div><br>") +
                "<br>" +
                "<div><strong>Ritual Card:</strong> " + escapeHTML(ritual.ritualCard.Name) + " [Slot " + ritual.ritualSlot + "]</div>" +
                "<div><strong>Sacrifice 1:</strong> " + escapeHTML(ritual.sacrifice1Card.Name) + " [Slot " + ritual.sacrifice1Slot + "]</div>" +
                "<div><strong>Sacrifice 2:</strong> " + escapeHTML(ritual.sacrifice2Card.Name) + " [Slot " + ritual.sacrifice2Slot + "]</div>" +
                "<div><strong>Sacrifice 3:</strong> " + escapeHTML(ritual.sacrifice3Card.Name) + " [Slot " + ritual.sacrifice3Slot + "]</div>" +
            "</div>";

    });


    html += "</div>";
    return html;

}


/*
 * ------------------------------------------------------------
 * 7. FUSION / EQUIP / RITUAL COMPUTATION
 * ------------------------------------------------------------
 */

function calculateHand() {

    var activeItems = [];


    handCards.forEach(function (card, index) {

        if (card) {

            activeItems.push({
                card: card,
                slot: index + 1
            });

        }

    });


    if (activeItems.length < 2) {

        outputLeft.innerHTML = "";
        outputRight.innerHTML = "";
        return;

    }


    var directFusions = [];
    var chainRoots = [];
    var equipRoots = [];
    var rituals = [];


    /* 1. Direct Fusions (2-card combinations) */
    for (var i = 0; i < activeItems.length; i++) {

        for (var j = i + 1; j < activeItems.length; j++) {

            var item1 = activeItems[i];
            var item2 = activeItems[j];

            var list1 = fusionsList[item1.card.Id] || [];
            var list2 = fusionsList[item2.card.Id] || [];


            list1.forEach(function (f) {

                if (f.card === item2.card.Id) {

                    var res = getCardById(f.result);

                    if (res) {

                        directFusions.push({
                            card1: item1.card,
                            card2: item2.card,
                            result: res,
                            glitch: false
                        });

                    }

                }

            });


            list2.forEach(function (f) {

                if (f.card === item1.card.Id) {

                    var res = getCardById(f.result);

                    if (res) {

                        var exists = directFusions.some(function (df) {
                            return (
                                df.result.Id === res.Id &&
                                ((df.card1.Id === item1.card.Id && df.card2.Id === item2.card.Id) ||
                                 (df.card1.Id === item2.card.Id && df.card2.Id === item1.card.Id))
                            );
                        });

                        if (!exists) {

                            directFusions.push({
                                card1: item2.card,
                                card2: item1.card,
                                result: res,
                                glitch: false
                            });

                        }

                    }

                }

            });


            var glitchMatches = glitchFusionDefinitions.filter(function (gf) {

                return (
                    (gf.card1.Id === item1.card.Id && gf.card2.Id === item2.card.Id) ||
                    (gf.card2.Id === item1.card.Id && gf.card1.Id === item2.card.Id)
                );

            });


            glitchMatches.forEach(function (gf) {

                directFusions.push({
                    card1: item1.card,
                    card2: item2.card,
                    result: gf.result,
                    glitch: true
                });

            });

        }

    }


    /* 2. Fusion Chains (3+ cards) */
    if (activeItems.length >= 3) {

        activeItems.forEach(function (startItem, index) {

            var remaining = activeItems.slice(0, index).concat(activeItems.slice(index + 1));
            var visitedKeys = {};

            var steps = createChainStepNode(startItem.card, startItem.slot, remaining, visitedKeys);

            steps.forEach(function (step) {

                if (step.nextSteps.length > 0) {
                    chainRoots.push(step);
                }

            });

        });

    }


    /* 3. Equip Possibilities */
    activeItems.forEach(function (item, index) {

        if (!isMonster(item.card)) {
            return;
        }

        var remaining = activeItems.slice(0, index).concat(activeItems.slice(index + 1));
        var visitedKeys = {};

        var equipSteps = createEquipStepNode(item.card, item.slot, remaining, visitedKeys);

        if (equipSteps.length > 0) {

            equipRoots.push({
                baseCard: item.card,
                baseSlot: item.slot,
                nextSteps: equipSteps
            });

        }

    });


    /* 4. Ritual Summons */
    ritualDefinitions.forEach(function (ritualDef) {

        var ritualCard = getCardByName(ritualDef.ritualCard);
        var sacrifice1 = getCardByName(ritualDef.sacrifice1);
        var sacrifice2 = getCardByName(ritualDef.sacrifice2);
        var sacrifice3 = getCardByName(ritualDef.sacrifice3);
        var resultCard = getCardByName(ritualDef.result);

        if (!ritualCard || !sacrifice1 || !sacrifice2 || !sacrifice3 || !resultCard) {
            return;
        }


        var required = [ritualCard.Id, sacrifice1.Id, sacrifice2.Id, sacrifice3.Id];
        var matchedSlots = {};
        var possible = true;


        required.forEach(function (reqId) {

            var match = activeItems.find(function (item) {
                return item.card.Id === reqId && !matchedSlots[item.slot];
            });

            if (match) {
                matchedSlots[match.slot] = true;
            } else {
                possible = false;
            }

        });


        if (possible) {

            rituals.push({
                resultCard: resultCard,
                ritualCard: ritualCard,
                ritualSlot: activeItems.find(function (i) { return i.card.Id === ritualCard.Id; }).slot,
                sacrifice1Card: sacrifice1,
                sacrifice1Slot: activeItems.find(function (i) { return i.card.Id === sacrifice1.Id; }).slot,
                sacrifice2Card: sacrifice2,
                sacrifice2Slot: activeItems.find(function (i) { return i.card.Id === sacrifice2.Id; }).slot,
                sacrifice3Card: sacrifice3,
                sacrifice3Slot: activeItems.find(function (i) { return i.card.Id === sacrifice3.Id; }).slot
            });

        }

    });


    /* Output Left: Direct Fusions + Rituals */
    outputLeft.innerHTML =
        (directFusions.length > 0 ? resultsToHTML(directFusions, "Fusions") : "") +
        (rituals.length > 0 ? renderRitualsHTML(rituals) : "");

    /* Output Right: Chains + Equips */
    outputRight.innerHTML =
        (chainRoots.length > 0 ? renderChainsHTML(chainRoots) : "") +
        (equipRoots.length > 0 ? renderEquipsHTML(equipRoots) : "");

}


/*
 * ------------------------------------------------------------
 * 8. INPUT RENDERING & AUTOCOMPLETE
 * ------------------------------------------------------------
 */

function createInputSlot(slotNumber) {

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

    var currentCard = handCards[slotNumber - 1];

    if (currentCard) {
        input.value = currentCard.Name;
    }


    var info = document.createElement("div");
    info.id = "hand-info" + slotNumber;
    info.className = "hand-card-info";
    info.textContent = getCardSummaryText(currentCard);


    wrapper.appendChild(number);
    wrapper.appendChild(input);
    wrapper.appendChild(info);


    var completion = new Awesomplete(input, {
        list: cardNames,
        autoFirst: true,
        filter: Awesomplete.FILTER_STARTSWITH
    });


    function commitSelection() {

        var enteredName = input.value.trim();
        var matchedCard = getCardByName(enteredName);

        handCards[slotNumber - 1] = matchedCard;
        info.textContent = getCardSummaryText(matchedCard);

        calculateHand();

    }


    input.addEventListener("input", function () {

        if (input.value.trim() === "") {

            handCards[slotNumber - 1] = null;
            info.textContent = "";
            calculateHand();

        }

    });


    input.addEventListener("change", function () {
        completion.select();
        commitSelection();
    });


    input.addEventListener("awesomplete-selectcomplete", function () {
        commitSelection();
    });


    return wrapper;

}


function renderPage() {

    handInputGroup.innerHTML = "";

    var startSlot = (currentPage - 1) * PAGE_SIZE + 1;
    var endSlot = Math.min(currentPage * PAGE_SIZE, HAND_SIZE);

    for (var slot = startSlot; slot <= endSlot; slot++) {
        handInputGroup.appendChild(createInputSlot(slot));
    }

    updatePagination();

}


/*
 * ------------------------------------------------------------
 * 9. PAGINATION CONTROLS
 * ------------------------------------------------------------
 */

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


document.getElementById("hand-prev").addEventListener("click", function () {
    changePage(currentPage - 1);
});


document.getElementById("hand-next").addEventListener("click", function () {
    changePage(currentPage + 1);
});


/*
 * ------------------------------------------------------------
 * 10. RESET
 * ------------------------------------------------------------
 */

function resultsClear() {

    outputLeft.innerHTML = "";
    outputRight.innerHTML = "";

}


function inputsClear() {

    handCards.fill(null);
    currentPage = 1;

    renderPage();
    resultsClear();

}


document.getElementById("resetBtn").addEventListener("click", function () {
    inputsClear();
});


/*
 * ------------------------------------------------------------
 * 11. INITIAL RENDER
 * ------------------------------------------------------------
 */

renderPage();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
