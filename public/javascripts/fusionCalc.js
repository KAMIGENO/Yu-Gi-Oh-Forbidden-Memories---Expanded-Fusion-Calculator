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


/*
 * ------------------------------------------------------------
 * 2. CARD DATABASE LOOKUPS
 * ------------------------------------------------------------
 */

var allCards = card_db().get();
var cardNames = [];
var cardById = {};
var cardByName = {};

allCards.forEach(function (card) {

    cardNames.push(card.Name);
    cardById[card.Id] = card;
    cardByName[card.Name.toLowerCase()] = card;

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

    fusionLookup[cardId] = {};

    fusionList.forEach(function (fusion) {

        if (!fusion || fusion.card == null) {
            return;
        }

        fusionLookup[cardId][fusion.card] = fusion.result;

    });

});


glitchFusions.forEach(function (fusion) {

    var c1 = getCardByName(fusion.card1);
    var c2 = getCardByName(fusion.card2);
    var res = getCardByName(fusion.result);

    if (!c1 || !c2 || !res) {
        return;
    }

    if (!glitchFusionLookup[c1.Id]) {
        glitchFusionLookup[c1.Id] = {};
    }

    if (!glitchFusionLookup[c2.Id]) {
        glitchFusionLookup[c2.Id] = {};
    }

    glitchFusionLookup[c1.Id][c2.Id] = res.Id;
    glitchFusionLookup[c2.Id][c1.Id] = res.Id;

});


equipsList.forEach(function (equips, monsterId) {

    if (!equips) {
        return;
    }


    equips.forEach(function (equipId) {

        if (equipId == null) {
            return;
        }

        if (!equipLookup[equipId]) {
            equipLookup[equipId] = {};
        }

        equipLookup[equipId][monsterId] = true;

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

        ritualDefinitions.push(ritual);

    });

});


var fieldDefinitions = fieldList || [];


function getFusionResult(cardA, cardB) {

    if (!cardA || !cardB) {
        return null;
    }

    var normal =
        (fusionLookup[cardA.Id] || {})[cardB.Id] ||
        (fusionLookup[cardB.Id] || {})[cardA.Id];

    if (normal) {
        return {
            result: getCardById(normal),
            isGlitch: false
        };
    }

    var glitch =
        (glitchFusionLookup[cardA.Id] || {})[cardB.Id] ||
        (glitchFusionLookup[cardB.Id] || {})[cardA.Id];

    if (glitch) {
        return {
            result: getCardById(glitch),
            isGlitch: true
        };
    }


    return null;

}


function isMonster(card) {

    return !!card && card.Type < 20;

}


function isEquip(card) {

    return !!card && card.Type === 23;

}


function getCardTypeName(card) {

    if (!card) {
        return "Unknown";
    }

    if (card.Type === 20) {
        return fieldCardIds[card.Id] ? "Magic (Field)" : "Magic (Effect)";
    }

    return cardTypes[card.Type] || "Unknown";

}


/*
 * ------------------------------------------------------------
 * 4. DISPLAY HELPERS
 * ------------------------------------------------------------
 */

function formatCardId(id) {

    return "#" + String(id).padStart(3, "0");

}


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/\'/g, "&#039;");

}


function formatInputCard(card) {

    if (!card) {
        return "";
    }

    return formatCardId(card.Id) + " " + card.Name;

}


function formatBoldInputCard(card) {

    if (!card) {
        return "";
    }

    return "<strong>" +
        escapeHTML(formatInputCard(card)) +
        "</strong>";

}


function formatGuardianStars(card) {

    if (!isMonster(card)) {
        return "";
    }

    var star1 = starNames[card.GuardianStarA - 1] || "";
    var star2 = starNames[card.GuardianStarB - 1] || "";

    var star1Symbol = guardianStarSymbols[star1] || "";
    var star2Symbol = guardianStarSymbols[star2] || "";

    return (
        star1Symbol + " " + star1 +
        " / " +
        star2Symbol + " " + star2
    );

}


var guardianStarSymbols = {
    Sun: "☉", Mercury: "☿", Venus: "♀", Moon: "☾",
    Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "⛢",
    Neptune: "♆", Pluto: "♇"
};


function formatCardDetails(card) {

    if (!card) {
        return "";
    }

    var details = "Type: " + getCardTypeName(card);

    if (isMonster(card)) {
        details +=
            " — Stars: " +
            formatGuardianStars(card) +
            " — " +
            card.Attack +
            "A / " +
            card.Defense +
            "D";
    }

    return details;

}


/*
 * ------------------------------------------------------------
 * 5. FUSION CHAIN SEARCH
 *
 * Traverses forward fusions up to 5 cards deep using the player's
 * hand. Duplicate paths and duplicate results are suppressed.
 * ------------------------------------------------------------
 */

var MAX_CHAIN_DEPTH = 5;


function buildFusionChains(cards) {

    if (!cards || cards.length < 2) {
        return [];
    }

    var available = {};

    cards.forEach(function (card) {
        available[card.Id] = (available[card.Id] || 0) + 1;
    });

    var uniqueCards = Object.keys(available)
        .map(function (cardId) {
            return getCardById(Number(cardId));
        })
        .filter(Boolean)
        .sort(function (a, b) {
            return a.Id - b.Id;
        });

    var allChains = [];

    function searchChains(currentResult, currentChain, currentAvailable) {

        if (currentChain.length >= MAX_CHAIN_DEPTH - 1) {
            return;
        }

        uniqueCards.forEach(function (nextCard) {

            if ((currentAvailable[nextCard.Id] || 0) <= 0) {
                return;
            }

            var nextFusion = getFusionResult(currentResult, nextCard);

            if (!nextFusion) {
                return;
            }

            var nextAvailable = {};
            Object.keys(currentAvailable).forEach(function (key) {
                nextAvailable[key] = currentAvailable[key];
            });
            nextAvailable[nextCard.Id] -= 1;

            var nextStep = {
                card1: currentResult,
                card2: nextCard,
                result: nextFusion.result,
                isGlitch: nextFusion.isGlitch
            };

            var nextChain = currentChain.concat([nextStep]);

            allChains.push(nextChain);
            searchChains(nextFusion.result, nextChain, nextAvailable);

        });

    }

    for (var i = 0; i < uniqueCards.length; i++) {

        var firstCard = uniqueCards[i];

        for (var j = i; j < uniqueCards.length; j++) {

            var secondCard = uniqueCards[j];

            if (firstCard.Id === secondCard.Id && available[firstCard.Id] < 2) {
                continue;
            }

            var baseFusion = getFusionResult(firstCard, secondCard);

            if (!baseFusion) {
                continue;
            }

            var baseAvailable = {};
            Object.keys(available).forEach(function (key) {
                baseAvailable[key] = available[key];
            });
            baseAvailable[firstCard.Id] -= 1;
            baseAvailable[secondCard.Id] -= 1;

            var baseStep = {
                card1: firstCard,
                card2: secondCard,
                result: baseFusion.result,
                isGlitch: baseFusion.isGlitch
            };

            var baseChain = [baseStep];

            allChains.push(baseChain);
            searchChains(baseFusion.result, baseChain, baseAvailable);

        }

    }

    return deduplicateChains(allChains);

}


function deduplicateChains(chains) {

    var seen = {};

    return chains.filter(function (chain) {

        var ids = [];

        chain.forEach(function (step, index) {

            if (index === 0) {
                ids.push(step.card1.Id);
                ids.push(step.card2.Id);
                return;
            }

            ids.push(step.card2.Id);

        });

        ids.sort(function (a, b) {
            return a - b;
        });

        var key = ids.join(",") + "=>" + chain[chain.length - 1].result.Id;

        if (seen[key]) {
            return false;
        }

        seen[key] = true;
        return true;

    });

}


function canEquip(equipCard, targetCard) {

    if (!equipCard || !targetCard) {
        return false;
    }

    if (!isEquip(equipCard) || !isMonster(targetCard)) {
        return false;
    }

    return (equipLookup[equipCard.Id] || {})[targetCard.Id] === true;

}


function buildEquipTargets(cards, rituals, chains) {

    var reachable = {};

    cards.forEach(function (card) {

        if (!card) {
            return;
        }

        reachable[card.Id] = {
            card: card,
            depth: 1
        };

    });

    var fusionChains = chains || buildFusionChains(cards);

    fusionChains.forEach(function (chain) {

        chain.forEach(function (step, index) {

            var resultCard = step.result;

            if (!resultCard) {
                return;
            }

            var depth = index + 2;
            var current = reachable[resultCard.Id];

            if (!current || depth < current.depth) {

                reachable[resultCard.Id] = {
                    card: resultCard,
                    depth: depth
                };

            }

        });

    });

    if (rituals && rituals.length > 0) {

        rituals.forEach(function (ritual) {

            if (!ritual || !ritual.result) {
                return;
            }

            var depth = 2;
            var current = reachable[ritual.result.Id];

            if (!current || depth < current.depth) {

                reachable[ritual.result.Id] = {
                    card: ritual.result,
                    depth: depth
                };

            }

        });

    }

    var equipCardMap = {};

    cards.forEach(function (card) {

        if (isEquip(card)) {
            equipCardMap[card.Id] = card;
        }

    });

    Object.keys(reachable).forEach(function (id) {

        var card = reachable[id].card;

        if (isEquip(card)) {
            equipCardMap[card.Id] = card;
        }

    });

    var equipCards = Object.keys(equipCardMap).map(function (id) {
        return equipCardMap[id];
    });

    if (equipCards.length === 0) {
        return [];
    }

    return equipCards.map(function (equipCard) {

        var targets = Object.keys(reachable)
            .map(function (cardId) {
                return reachable[cardId];
            })
            .filter(function (entry) {
                return canEquip(equipCard, entry.card);
            })
            .sort(function (a, b) {

                if (a.depth !== b.depth) {
                    return a.depth - b.depth;
                }

                var atkDiff = (b.card.Attack || 0) - (a.card.Attack || 0);

                if (atkDiff !== 0) {
                    return atkDiff;
                }

                var defDiff = (b.card.Defense || 0) - (a.card.Defense || 0);

                if (defDiff !== 0) {
                    return defDiff;
                }

                return a.card.Id - b.card.Id;

            });

        return {
            equipCard: equipCard,
            targets: targets
        };

    }).filter(function (entry) {
        return entry.targets.length > 0;
    }).sort(function (a, b) {
        return a.equipCard.Id - b.equipCard.Id;
    });

}


function formatEquipTargetLine(card, depth) {

    var indentRem = depth * 2;

    return (
        "<div class='fusion-chain-step" +
        (depth === 0 ? "" : " fusion-chain-followup") +
        "' style='margin-left: " + indentRem + "rem;'>" +
        formatBoldInputCard(card) +
        "</div>"
    );

}


function equipsToHTML(equipEntries) {

    if (!equipEntries || equipEntries.length === 0) {
        return "";
    }

    return equipEntries
        .map(function (entry) {

            var equipHeader =
                "<div class='fusion-chain-step' style='margin-left: 0rem;'>" +
                "<strong style='color: #198754;'>" +
                escapeHTML(formatCardId(entry.equipCard.Id) + " " + entry.equipCard.Name) +
                "</strong>" +
                "</div>";

            var targetsHTML = entry.targets
                .map(function (target) {
                    return formatEquipTargetLine(target.card, target.depth);
                })
                .join("");

            return (
                "<div class='result-div fusion-chain-result'>" +
                equipHeader +
                targetsHTML +
                "</div>"
            );

        })
        .join("\n");

}


function formatFusionStep(step, index) {

    var firstCard =
        index === 0 && step.card1.Id > step.card2.Id
            ? step.card2
            : step.card1;

    var secondCard =
        firstCard === step.card1
            ? step.card2
            : step.card1;


    var html =
        "<div class='fusion-chain-step" +
        (index === 0 ? "" : " fusion-chain-followup") +
        "' style='margin-left: " + (index * 2) + "rem;'>";


    if (step.glitch) {
        html += "<strong>Glitch Fusion</strong><br>";
    }


    html +=
        formatBoldInputCard(firstCard) +
        " + " +
        formatBoldInputCard(secondCard) +
        " = " +
        formatBoldInputCard(step.result);


    html +=
        "<br>" +
        escapeHTML(formatCardDetails(step.result));


    return html + "</div>";

}


function fusionChainsToHTML(chains) {

    return chains
        .slice()
        .sort(function (a, b) {

            var maxSteps = Math.max(a.length, b.length);

            for (var i = 0; i < maxSteps; i++) {

                var aStep = a[i];
                var bStep = b[i];

                if (!aStep) {
                    return -1;
                }

                if (!bStep) {
                    return 1;
                }

                var aLeft = Math.min(aStep.card1.Id, aStep.card2.Id);
                var bLeft = Math.min(bStep.card1.Id, bStep.card2.Id);

                if (aLeft !== bLeft) {
                    return aLeft - bLeft;
                }

                var aRight = Math.max(aStep.card1.Id, aStep.card2.Id);
                var bRight = Math.max(bStep.card1.Id, bStep.card2.Id);

                if (aRight !== bRight) {
                    return aRight - bRight;
                }

                if (aStep.result.Id !== bStep.result.Id) {
                    return aStep.result.Id - bStep.result.Id;
                }

            }

            return 0;
        })
        .map(function (chain) {

            return (
                "<div class='result-div fusion-chain-result'>" +
                chain
                    .map(function (step, index) {
                        return formatFusionStep(step, index);
                    })
                    .join("") +
                "</div>"
            );

        })
        .join("\n");

}


function fieldsToHTML(cards, chains, rituals) {

    var reachableCards = {};
    var fusionDepths = {};

    cards.forEach(function (card) {

        if (isMonster(card)) {
            reachableCards[card.Id] = card;
            fusionDepths[card.Id] = 1;
        }

    });

    chains.forEach(function (chain) {

        chain.forEach(function (step, stepIndex) {

            if (isMonster(step.result)) {

                var depth = stepIndex + 2;

                reachableCards[step.result.Id] = step.result;

                if (fusionDepths[step.result.Id] == null || depth < fusionDepths[step.result.Id]) {
                    fusionDepths[step.result.Id] = depth;
                }

            }

        });

    });

    if (rituals && rituals.length > 0) {

        rituals.forEach(function (ritual) {

            if (!ritual || !ritual.result || !isMonster(ritual.result)) {
                return;
            }

            var finalResult = ritual.result;
            var depth = 2;

            if (fusionDepths[finalResult.Id] == null || depth < fusionDepths[finalResult.Id]) {
                fusionDepths[finalResult.Id] = depth;
            }

            reachableCards[finalResult.Id] = finalResult;

        });

    }

    var monsterCards = Object.keys(reachableCards).map(function (id) {
        return reachableCards[id];
    });

    if (monsterCards.length === 0) {
        return "";
    }

    var html = "";

    fieldDefinitions.forEach(function (definition) {

        var fieldCard = getCardById(definition.CardId);

        if (!fieldCard) {
            return;
        }

        [true, false].forEach(function (positive) {

            var matchingMonsters = [];

            monsterCards.forEach(function (card) {

                if (!card) {
                    return;
                }

                var applies = positive
                    ? definition.PositiveTypes.indexOf(card.Type) !== -1
                    : definition.NegativeTypes.indexOf(card.Type) !== -1;


                if (!applies) {
                    return;
                }

                var depth = fusionDepths[card.Id] != null
                    ? fusionDepths[card.Id]
                    : 1;

                matchingMonsters.push({
                    card: card,
                    depth: depth
                });

            });

            if (matchingMonsters.length === 0) {
                return;
            }

            matchingMonsters.sort(function (a, b) {

                if (a.depth !== b.depth) {
                    return a.depth - b.depth;
                }

                var atkDiff = (b.card.Attack || 0) - (a.card.Attack || 0);

                if (atkDiff !== 0) {
                    return atkDiff;
                }

                var defDiff = (b.card.Defense || 0) - (a.card.Defense || 0);

                if (defDiff !== 0) {
                    return defDiff;
                }

                return a.card.Id - b.card.Id;

            });

            var sign = positive ? "+" : "−";
            var signClass = positive ? "field-positive" : "field-negative";

            var fieldHeader =
                "<div class='fusion-chain-step field-header " + signClass + "'>" +
                "<strong>" + sign + "</strong> " +
                formatBoldInputCard(fieldCard) +
                "</div>";

            var monstersHTML = matchingMonsters
                .map(function (entry) {

                    var indentRem = entry.depth * 2;

                    return (
                        "<div class='fusion-chain-step" +
                        (entry.depth === 0 ? "" : " fusion-chain-followup") +
                        "' style='margin-left: " + indentRem + "rem;'>" +
                        formatBoldInputCard(entry.card) +
                        "</div>"
                    );

                })
                .join("");

            html +=
                "<div class='result-div fusion-chain-result field-result'>" +
                fieldHeader +
                monstersHTML +
                "</div>";

        });

    });

    return html;

}


/*
 * ------------------------------------------------------------
 * 6. FUSION & RITUAL CALCULATION
 * ------------------------------------------------------------
 */

function findFusions() {

    var cards = handCards.filter(function (card) {
        return card !== null;
    });

    var chains = buildFusionChains(cards);
    var rituals = findRituals(cards);
    var equipEntries = buildEquipTargets(cards, rituals, chains);

    var fields = fieldsToHTML(
        cards,
        chains,
        rituals
    );

    var fusionsHTML = fusionChainsToHTML(chains);
    var ritualsHTML = ritualsToHTML(rituals);
    var equipsHTML = equipsToHTML(equipEntries);

    outputLeft.innerHTML =
        "<section class='fusion-calculator-output-section output-left-section'>" +
        "<h2 class='text-left'>Fusions:</h2>" +
        fusionsHTML +
        "</section>" +
        "<section class='fusion-calculator-output-section output-left-section'>" +
        "<h2 class='text-left'>Rituals:</h2>" +
        ritualsHTML +
        "</section>";

    outputRight.innerHTML =
        "<section class='fusion-calculator-output-section output-right-section'>" +
        "<h2 class='text-left'>Equips:</h2>" +
        equipsHTML +
        "</section>" +
        "<section class='fusion-calculator-output-section output-right-section'>" +
        "<h2 class='text-left'>Fields:</h2>" +
        fields +
        "</section>";

}


function findRituals(cards) {

    var cardCounts = {};


    cards.forEach(function (card) {

        cardCounts[card.Id] = (cardCounts[card.Id] || 0) + 1;

    });


    return ritualDefinitions
        .map(function (ritual) {

            var requiredCards = [
                ritual.ritual_card,
                ritual.card1,
                ritual.card2,
                ritual.card3
            ];

            var requiredCounts = {};


            requiredCards.forEach(function (cardId) {
                requiredCounts[cardId] = (requiredCounts[cardId] || 0) + 1;
            });


            var canRitual = Object.keys(requiredCounts).every(function (cardId) {

                return (cardCounts[cardId] || 0) >= requiredCounts[cardId];

            });


            if (!canRitual) {
                return null;
            }


            return {
                ritualCard: getCardById(ritual.ritual_card),
                card1: getCardById(ritual.card1),
                card2: getCardById(ritual.card2),
                card3: getCardById(ritual.card3),
                result: getCardById(ritual.result)
            };

        })
        .filter(function (ritual) {
            return ritual &&
                ritual.ritualCard &&
                ritual.card1 &&
                ritual.card2 &&
                ritual.card3 &&
                ritual.result;
        });

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
                "<div><strong>Result:</strong> " +
                formatBoldInputCard(ritual.result) +
                "<br>" +
                escapeHTML(formatCardDetails(ritual.result)) +
                "</div>" +
                "</div>"
            );

        })
        .join("\n");

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


    info.textContent = formatCardDetails(card);

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


/*
 * ------------------------------------------------------------
 * 9. PAGINATION CONTROLS
 * ------------------------------------------------------------
 */

function updatePagination() {

    var pageLabel = document.getElementById("hand-page-label");
    var prevButton = document.getElementById("hand-prev");
    var nextButton = document.getElementById("hand-next");


    var startSlot = (currentPage - 1) * PAGE_SIZE + 1;
    var endSlot = Math.min(currentPage * PAGE_SIZE, HAND_SIZE);

    var paddedStartSlot =
        startSlot < 10
            ? "00" + startSlot
            : startSlot < 100
                ? "0" + startSlot
                : String(startSlot);

    var paddedEndSlot =
        endSlot < 10
            ? "00" + endSlot
            : endSlot < 100
                ? "0" + endSlot
                : String(endSlot);

    pageLabel.textContent =
        "Slots " +
        paddedStartSlot +
        "–" +
        paddedEndSlot +
        " of " +
        HAND_SIZE;


    prevButton.disabled = currentPage === 1;
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
