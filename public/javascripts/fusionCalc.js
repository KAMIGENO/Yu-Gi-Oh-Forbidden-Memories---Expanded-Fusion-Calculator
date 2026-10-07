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
 * Pre-build index-based and name-based lookups to avoid O(N)
 * searches over 722 cards in tight calculation loops.
 * ------------------------------------------------------------
 */

var cardById = {};
var cardByName = {};

allCards.forEach(function (card) {

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

    fusionLookup[cardId] = {};

    fusionList.forEach(function (fusion) {
        fusionLookup[cardId][fusion.card] = fusion.result;
    });

});


glitchFusionsList.forEach(function (fusionList, cardId) {

    if (!fusionList) {
        return;
    }

    glitchFusionLookup[cardId] = {};

    fusionList.forEach(function (fusion) {
        glitchFusionLookup[cardId][fusion.card] = fusion.result;
    });

});


equipsList.forEach(function (equipList, cardId) {

    if (!equipList) {
        return;
    }

    equipLookup[cardId] = {};

    equipList.forEach(function (equipId) {
        equipLookup[cardId][equipId] = true;
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


function getFusion(card1, card2) {

    if (!card1 || !card2) {
        return null;
    }


    var standardResultId =
        (fusionLookup[card1.Id] && fusionLookup[card1.Id][card2.Id]) ||
        (fusionLookup[card2.Id] && fusionLookup[card2.Id][card1.Id]);

    if (standardResultId) {
        return {
            result: getCardById(standardResultId),
            isGlitch: false
        };
    }


    var glitchResultId =
        (glitchFusionLookup[card1.Id] && glitchFusionLookup[card1.Id][card2.Id]) ||
        (glitchFusionLookup[card2.Id] && glitchFusionLookup[card2.Id][card1.Id]);

    if (glitchResultId) {
        return {
            result: getCardById(glitchResultId),
            isGlitch: true
        };
    }


    return null;

}


function isMonster(card) {

    return !!card && card.Type < 20;

}


function getCardTypeName(card) {

    if (!card) {
        return "Unknown";
    }

    return cardTypes[card.Type] || "Unknown";

}


/*
 * ------------------------------------------------------------
 * 4. FORMATTING HELPERS
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

    return star1 + " / " + star2;

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

    var chains = [];
    var seenPairs = {};


    for (var i = 0; i < cards.length; i++) {

        for (var j = i + 1; j < cards.length; j++) {

            var first = cards[i];
            var second = cards[j];

            var pairKey =
                Math.min(first.Id, second.Id) +
                ":" +
                Math.max(first.Id, second.Id);


            if (seenPairs[pairKey]) {
                continue;
            }

            seenPairs[pairKey] = true;

            var fusion = getFusion(first, second);

            if (!fusion) {
                continue;
            }

            var usedIndexes = {};
            usedIndexes[i] = true;
            usedIndexes[j] = true;

            var step = {
                card1: first,
                card2: second,
                result: fusion.result,
                isGlitch: fusion.isGlitch,
                parentResult: null
            };

            chains.push([step]);

            extendFusionChain([step], usedIndexes, cards, chains);

        }

    }

    return sortFusionChains(chains);

}


function extendFusionChain(currentChain, usedIndexes, cards, chains) {

    if (currentChain.length >= (MAX_CHAIN_DEPTH - 1)) {
        return;
    }


    var currentResult = currentChain[currentChain.length - 1].result;
    var seenNextCardIds = {};


    for (var i = 0; i < cards.length; i++) {

        if (usedIndexes[i]) {
            continue;
        }

        var nextCard = cards[i];

        if (seenNextCardIds[nextCard.Id]) {
            continue;
        }

        seenNextCardIds[nextCard.Id] = true;

        var fusion = getFusion(currentResult, nextCard);

        if (!fusion) {
            continue;
        }

        var nextStep = {
            card1: nextCard,
            card2: currentResult,
            result: fusion.result,
            isGlitch: fusion.isGlitch,
            parentResult: currentResult
        };

        var nextUsedIndexes = Object.assign({}, usedIndexes);
        nextUsedIndexes[i] = true;

        var nextChain = currentChain.concat([nextStep]);

        chains.push(nextChain);

        extendFusionChain(nextChain, nextUsedIndexes, cards, chains);

    }

}


function canEquip(equipCard, targetCard) {

    if (!equipCard || !targetCard || !isMonster(targetCard)) {
        return false;
    }

    return (
        Array.isArray(equipCard.Equip) &&
        equipCard.Equip.indexOf(targetCard.Id) !== -1
    );

}


function buildEquipTargets(cards, rituals, chains) {

    /*
     * Use the same fusion-chain generation as the Fusion Calculator
     * Fusions section.
     *
     * Depth represents the minimum number of original hand cards needed:
     *   1 = card already in hand
     *   2 = two-card fusion or ritual
     *   3 = three-card fusion, etc.
     */
    var reachable = {};


    cards.forEach(function (card) {

        reachable[card.Id] = {
            card: card,
            depth: 1,
            steps: []
        };

    });


    var fusionChains = chains || buildFusionChains(cards);

    fusionChains.forEach(function (chain) {

        chain.forEach(function (step, index) {

            if (!step.result) {
                return;
            }


            var depth = index + 2;
            var current = reachable[step.result.Id];


            if (!current || depth < current.depth) {

                reachable[step.result.Id] = {
                    card: step.result,
                    depth: depth,
                    steps: chain.slice(0, index + 1)
                };

            }

        });

    });


    if (Array.isArray(rituals)) {

        rituals.forEach(function (ritual) {

            if (!ritual || !ritual.result || !isMonster(ritual.result)) {
                return;
            }

            var depth = 2;
            var current = reachable[ritual.result.Id];

            if (!current || depth < current.depth) {

                reachable[ritual.result.Id] = {
                    card: ritual.result,
                    depth: depth,
                    steps: []
                };

            }

        });

    }


    /*
     * The card database identifies Equip cards directly through their
     * Equip property. Equip cards can come directly from the hand or from
     * reachable fusions (e.g. Dian Keto + Dian Keto -> Megamorph).
     */
    var equipCardMap = {};

    cards.forEach(function (card) {
        if (Array.isArray(card.Equip) && card.Equip.length > 0) {
            equipCardMap[card.Id] = card;
        }
    });

    Object.keys(reachable).forEach(function (id) {
        var card = reachable[id].card;
        if (Array.isArray(card.Equip) && card.Equip.length > 0) {
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
            .map(function (id) {
                return reachable[id];
            })
            .filter(function (entry) {

                return (
                    entry.card.Id !== equipCard.Id &&
                    canEquip(equipCard, entry.card)
                );

            })
            .sort(function (a, b) {

                if (a.depth !== b.depth) {
                    return a.depth - b.depth;
                }

                return a.card.Id - b.card.Id;

            });


        return {
            equip: equipCard,
            depth: 0,
            targets: targets
        };

    }).filter(function (entry) {
        return entry.targets.length > 0;
    });

}


function formatFusionStep(step, index) {

    var firstCard =
        index === 0 && step.card1.Id > step.card2.Id
            ? step.card2
            : step.card1;

    var secondCard =
        index === 0 && step.card1.Id > step.card2.Id
            ? step.card1
            : step.card2;

    var indentRem = index * 2;

    var prefix =
        index === 0
            ? formatBoldInputCard(firstCard) +
              " + " +
              formatBoldInputCard(secondCard) +
              " = "
            : "+ " +
              formatBoldInputCard(step.card1) +
              " = ";

    var glitchBadge =
        step.isGlitch
            ? " <span class='badge badge-warning font-weight-bold'>GLITCH</span>"
            : "";

    return (
        "<div class='fusion-chain-step" +
        (index === 0 ? "" : " fusion-chain-followup") +
        "' style='margin-left: " + indentRem + "rem;'>" +
        prefix +
        "<strong>" +
        escapeHTML(formatCardId(step.result.Id) + " " + step.result.Name) +
        "</strong>" +
        glitchBadge +
        " (" +
        escapeHTML("Type: " + getCardTypeName(step.result)) +
        (isMonster(step.result)
            ? " — Stars: " +
              escapeHTML(formatGuardianStars(step.result)) +
              " — " +
              escapeHTML(step.result.Attack) +
              "A / " +
              escapeHTML(step.result.Defense) +
              "D"
            : "") +
        ")" +
        "</div>"
    );

}


function sortFusionChains(chains) {

    return chains.sort(function (a, b) {

        var lastA = a[a.length - 1];
        var lastB = b[b.length - 1];

        var attackA = isMonster(lastA.result) ? lastA.result.Attack : -1;
        var attackB = isMonster(lastB.result) ? lastB.result.Attack : -1;

        if (attackB !== attackA) {
            return attackB - attackA;
        }

        var defenseA = isMonster(lastA.result) ? lastA.result.Defense : -1;
        var defenseB = isMonster(lastB.result) ? lastB.result.Defense : -1;

        if (defenseB !== defenseA) {
            return defenseB - defenseA;
        }

        if (a.length !== b.length) {
            return a.length - b.length;
        }

        return lastA.result.Id - lastB.result.Id;

    });

}


function fusionChainsToHTML(chains) {

    return chains
        .map(function (chain) {

            return (
                "<div class='result-div fusion-chain-result'>" +
                chain.map(function (step, index) {
                    return formatFusionStep(step, index);
                }).join("") +
                "</div>"
            );

        })
        .join("\n");

}


function formatEquipStep(depth, cardHTML) {

    return (
        "<div class='fusion-chain-step" +
        (depth === 0 ? "" : " fusion-chain-followup") +
        "' style='margin-left: " + (depth * 2) + "rem;'>" +
        cardHTML +
        "</div>"
    );

}


function formatEquipCard(card) {

    if (!card) {
        return "";
    }

    return "<strong style='color: #198754;'>" +
        escapeHTML(formatInputCard(card)) +
        "</strong>";

}


function equipsToHTML(equipEntries) {

    return equipEntries
        .slice()
        .sort(function (a, b) {
            return a.equip.Id - b.equip.Id;
        })
        .map(function (entry) {

            var html =
                "<div class='result-div fusion-chain-result'>" +
                formatEquipStep(0, formatEquipCard(entry.equip));


            entry.targets.forEach(function (target) {

                html += formatEquipStep(
                    target.depth,
                    formatBoldInputCard(target.card)
                );

            });


            return html + "</div>";

        })
        .join("\n");

}


function getFieldsForCard(card) {

    if (!card || !isMonster(card)) {
        return [];
    }


    return fieldList
        .map(function (definition) {

            var fieldCard = getCardById(definition.CardId);


            if (!fieldCard) {
                return null;
            }


            if (definition.PositiveTypes.indexOf(card.Type) !== -1) {
                return {
                    card: fieldCard,
                    positive: true
                };
            }


            if (definition.NegativeTypes.indexOf(card.Type) !== -1) {
                return {
                    card: fieldCard,
                    positive: false
                };
            }


            return null;

        })
        .filter(function (entry) {
            return !!entry;
        });

}


function fieldsToHTML(cards, chains, rituals) {

    var fields = {};
    var handCardIds = {};
    var fusionDepths = {};


    cards.forEach(function (card) {

        handCardIds[card.Id] = true;

        if (fusionDepths[card.Id] == null) {
            fusionDepths[card.Id] = 1;
        }

    });


    chains.forEach(function (chain) {

        var finalResult = chain[chain.length - 1].result;

        if (!isMonster(finalResult)) {
            return;
        }

        var depth = chain.length + 1;

        if (fusionDepths[finalResult.Id] == null || depth < fusionDepths[finalResult.Id]) {
            fusionDepths[finalResult.Id] = depth;
        }

    });


    var candidateMonsters = [];
    var seenCandidates = {};


    cards.forEach(function (card) {

        if (seenCandidates[card.Id]) {
            return;
        }

        seenCandidates[card.Id] = true;
        candidateMonsters.push(card);

    });


    chains.forEach(function (chain) {

        var finalResult = chain[chain.length - 1].result;

        if (!isMonster(finalResult) || seenCandidates[finalResult.Id]) {
            return;
        }

        seenCandidates[finalResult.Id] = true;
        candidateMonsters.push(finalResult);

    });


    if (Array.isArray(rituals)) {

        rituals.forEach(function (ritual) {

            if (!ritual || !ritual.result || !isMonster(ritual.result)) {
                return;
            }

            var finalResult = ritual.result;
            var depth = 2;

            if (fusionDepths[finalResult.Id] == null || depth < fusionDepths[finalResult.Id]) {
                fusionDepths[finalResult.Id] = depth;
            }

            if (!seenCandidates[finalResult.Id]) {
                seenCandidates[finalResult.Id] = true;
                candidateMonsters.push(finalResult);
            }

        });

    }


    fieldList.forEach(function (definition) {

        var fieldCard = getCardById(definition.CardId);

        if (!fieldCard) {
            return;
        }

        [true, false].forEach(function (positive) {

            var affected = [];
            var seen = {};

            candidateMonsters.forEach(function (card) {

                if (seen[card.Id]) {
                    return;
                }

                var matches = positive
                    ? definition.PositiveTypes.indexOf(card.Type) !== -1
                    : definition.NegativeTypes.indexOf(card.Type) !== -1;

                if (!matches) {
                    return;
                }


                seen[card.Id] = true;
                affected.push({
                    card: card,
                    depth: fusionDepths[card.Id]
                });

            });


            if (affected.length === 0) {
                return;
            }


            affected.sort(function (a, b) {

                if (a.depth !== b.depth) {
                    return a.depth - b.depth;
                }

                return a.card.Id - b.card.Id;

            });


            fields[fieldCard.Id + ":" + (positive ? "positive" : "negative")] = {
                card: fieldCard,
                affected: affected,
                positive: positive
            };

        });

    });


    return Object.keys(fields)
        .map(function (fieldKey) {

            return fields[fieldKey];

        })
        .sort(function (a, b) {

            if (a.card.Id !== b.card.Id) {
                return a.card.Id - b.card.Id;
            }

            return a.positive === b.positive
                ? 0
                : a.positive ? -1 : 1;

        })
        .map(function (field) {

            var html =
                "<div class='result-div fusion-chain-result field-result'>" +
                "<div class='fusion-chain-step field-header " +
                (field.positive ? "field-positive" : "field-negative") +
                "'>" +
                "<strong>" +
                (field.positive ? "+" : "-") +
                "</strong> " +
                formatBoldInputCard(field.card) +
                "</div>";


            field.affected.forEach(function (entry) {

                html +=
                    "<div class='fusion-chain-step" +
                    (entry.depth === 0 ? "" : " fusion-chain-followup") +
                    "' style='margin-left: " +
                    (entry.depth * 2) +
                    "rem;'>" +
                    formatBoldInputCard(entry.card) +
                    "</div>";

            });


            return html + "</div>";

        })
        .join("\n");

}


function findFusions() {

    var cards = handCards.filter(function (card) {
        return card !== null;
    });


    var chains = buildFusionChains(cards);
    var rituals = findRituals(cards);
    var equipEntries = buildEquipTargets(cards, rituals, chains);


    var fields = fieldsToHTML(
        cards.filter(function (card) {
            return isMonster(card);
        }),
        chains,
        rituals
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
 * 6. RITUAL CALCULATION
 * ------------------------------------------------------------
 */

function findRituals(cards) {

    var cardCounts = {};

    cards.forEach(function (card) {
        cardCounts[card.Id] = (cardCounts[card.Id] || 0) + 1;
    });


    return ritualDefinitions
        .map(function (ritual) {

            var requiredCounts = {};
            [
                ritual.ritual_card,
                ritual.card1,
                ritual.card2,
                ritual.card3
            ].forEach(function (id) {
                requiredCounts[id] = (requiredCounts[id] || 0) + 1;
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
                "<div><strong>Sacrifices:</strong> " +
                formatBoldInputCard(ritual.card1) +
                ", " +
                formatBoldInputCard(ritual.card2) +
                ", " +
                formatBoldInputCard(ritual.card3) +
                "</div>" +
                "<div><strong>Result:</strong> <strong>" +
                escapeHTML(formatCardId(ritual.result.Id) + " " + ritual.result.Name) +
                "</strong> (" +
                escapeHTML("Type: " + getCardTypeName(ritual.result)) +
                (isMonster(ritual.result)
                    ? " — Stars: " +
                      escapeHTML(formatGuardianStars(ritual.result)) +
                      " — " +
                      escapeHTML(ritual.result.Attack) +
                      "A / " +
                      escapeHTML(ritual.result.Defense) +
                      "D"
                    : "") +
                ")</div>" +
                "</div>"
            );

        })
        .join("\n");

}


/*
 * ------------------------------------------------------------
 * 7. DOM GENERATION
 * ------------------------------------------------------------
 */

function formatCardDetails(card) {

    return (
        "Type: " +
        getCardTypeName(card) +
        " — Stars: " +
        formatGuardianStars(card) +
        " — " +
        card.Attack +
        "A / " +
        card.Defense +
        "D"
    );

}


function updateCardInfo(input, info) {

    var card = getCardByName(input.value);


    if (!card) {
        info.textContent = "";
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
