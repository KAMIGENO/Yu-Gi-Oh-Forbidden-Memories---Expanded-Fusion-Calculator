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

        if (!fusion || fusion.card == null) {
            return;
        }

        fusionLookup[cardId][fusion.card] = fusion.result;

    });

});


glitchFusions.forEach(function (fusion) {

    if (!fusion || fusion.card1 == null || fusion.card2 == null) {
        return;
    }


    if (!glitchFusionLookup[fusion.card1]) {
        glitchFusionLookup[fusion.card1] = {};
    }

    if (!glitchFusionLookup[fusion.card2]) {
        glitchFusionLookup[fusion.card2] = {};
    }


    glitchFusionLookup[fusion.card1][fusion.card2] = fusion.result;
    glitchFusionLookup[fusion.card2][fusion.card1] = fusion.result;

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


/*
 * ------------------------------------------------------------
 * 4. DISPLAY HELPERS
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


function formatGuardianStar(value) {
    return starNames[value - 1] || starNames[0];
}


function formatGuardianStarWithSymbol(value) {
    var name = formatGuardianStar(value);
    return (guardianStarSymbols[name] || "") + " " + name;
}


function formatGuardianStars(card) {
    return (
        formatGuardianStarWithSymbol(card.GuardianStarA) +
        " / " +
        formatGuardianStarWithSymbol(card.GuardianStarB)
    );
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

    return (
        formatCardId(card.Id) +
        " " +
        card.Name +
        "\n" +
        formatCardDetails(card)
    );
}


function formatInputCard(card) {
    return formatCardId(card.Id) + " " + card.Name;
}


function formatBoldInputCard(card) {
    return "<strong>" + escapeHTML(formatInputCard(card)) + "</strong>";
}


function formatResultCard(card) {
    return formatCardSummary(card);
}


function formatBoldResultCard(card) {
    if (!card) {
        return "";
    }

    return (
        "<strong>" +
        escapeHTML(formatCardId(card.Id) + " " + card.Name) +
        "</strong><br>" +
        escapeHTML(formatCardDetails(card))
    );
}


function formatStandardResultCard(card) {
    if (!card) {
        return "";
    }

    var html =
        "<strong>" +
        escapeHTML(formatCardId(card.Id) + " " + card.Name) +
        "</strong><br>" +
        "Type: " +
        escapeHTML(getCardTypeName(card));

    if (isMonster(card)) {
        html +=
            "<br>Guardian Stars: " +
            escapeHTML(formatGuardianStars(card)) +
            "<br>" +
            escapeHTML(card.Attack) +
            "A / " +
            escapeHTML(card.Defense) +
            "D";
    }

    return html;
}


function fusesToHTML(fuselist) {

    return fuselist
        .map(function (fusion) {

            var res =
                "<div class='result-div'>";

            if (fusion.glitch) {
                res += "<strong>Glitch Fusion</strong><br>";
            }

            res +=
                formatBoldInputCard(fusion.card1) +
                "<br>" +
                formatBoldInputCard(fusion.card2);

            if (fusion.result) {
                res +=
                    "<br>" +
                    formatBoldResultCard(fusion.result);
            }

            return res + "</div>";

        })
        .join("");

}


function getCardTypeName(card) {

    if (!card) {
        return "Unknown";
    }

    if (card.Type === 20) {
        return fieldCardIds[card.Id]
            ? "Magic (Field)"
            : "Magic (Effect)";
    }

    return cardTypes[card.Type] || "Unknown";

}


/*
 * ------------------------------------------------------------
 * 5. FUSION CHAIN LOGIC
 * ------------------------------------------------------------
 */

function getFusion(card1, card2) {

    if (!card1 || !card2) {
        return null;
    }


    var resultId =
        (fusionLookup[card1.Id] && fusionLookup[card1.Id][card2.Id]) ||
        (fusionLookup[card2.Id] && fusionLookup[card2.Id][card1.Id]);

    if (resultId) {
        return {
            result: getCardById(resultId),
            glitch: false
        };
    }


    var glitchResultId =
        (glitchFusionLookup[card1.Id] && glitchFusionLookup[card1.Id][card2.Id]) ||
        (glitchFusionLookup[card2.Id] && glitchFusionLookup[card2.Id][card1.Id]);

    if (glitchResultId) {
        return {
            result: getCardById(glitchResultId),
            glitch: true
        };
    }


    return null;

}


function extendFusionChain(resultCard, cards, usedIndexes, steps, chains) {

    var extended = false;


    for (var i = 0; i < cards.length; i++) {

        if (usedIndexes[i]) {
            continue;
        }

        var nextCard = cards[i];
        var fusion = getFusion(resultCard, nextCard);

        if (!fusion) {
            continue;
        }

        extended = true;
        usedIndexes[i] = true;

        var nextStep = {
            card1: resultCard,
            card2: nextCard,
            result: fusion.result,
            glitch: fusion.glitch
        };

        steps.push(nextStep);

        extendFusionChain(
            fusion.result,
            cards,
            usedIndexes,
            steps,
            chains
        );

        steps.pop();
        usedIndexes[i] = false;

    }


    if (!extended && steps.length > 1) {
        chains.push(steps.slice());
    }

}


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
                glitch: fusion.glitch
            };

            chains.push([step]);

            extendFusionChain(
                fusion.result,
                cards,
                usedIndexes,
                [step],
                chains
            );

        }

    }


    var deduped = [];
    var seenChains = {};


    chains.forEach(function (chain) {

        var key = chain.map(function (step) {

            var left = Math.min(step.card1.Id, step.card2.Id);
            var right = Math.max(step.card1.Id, step.card2.Id);

            return left + "+" + right + "=" + step.result.Id;

        }).join("->");


        if (!seenChains[key]) {
            seenChains[key] = true;
            deduped.push(chain);
        }

    });


    return deduped;

}


function canEquip(equipCard, targetCard) {

    return !!(
        equipCard &&
        targetCard &&
        Array.isArray(equipCard.Equip) &&
        equipCard.Equip.indexOf(targetCard.Id) !== -1
    );

}


function buildEquipTargets(cards, rituals) {

    /*
     * The card database identifies Equip cards directly through their
     * Equip property. The equipsList lookup is organized by the monster
     * receiving the Equip card, so it must not be used to identify roots.
     */
    var equipCards = cards.filter(function (card) {
        return Array.isArray(card.Equip) && card.Equip.length > 0;
    });


    if (equipCards.length === 0) {
        return [];
    }


    /*
     * Use the same fusion-chain generation as the Fusion Calculator
     * Fusions section.
     *
     * Depth represents the minimum number of original hand cards needed:
     *   1 = card already in hand
     *   2 = two-card fusion
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


    buildFusionChains(cards).forEach(function (chain) {

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

            var depth = 4;
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
            var depth = 4;

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

                var applies = positive
                    ? definition.PositiveTypes.indexOf(card.Type) !== -1
                    : definition.NegativeTypes.indexOf(card.Type) !== -1;


                if (!applies) {
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
    var equipEntries = buildEquipTargets(cards, rituals);


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
