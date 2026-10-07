/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fieldStats.js
 * ------------------------------------------------------------
 *
 * Field Statistics
 *
 * Shows all Field cards as expandable sections and provides a
 * reverse lookup that starts with a monster card and shows how
 * every Field affects it.
 *
 * Field identity/effect definitions live in data/fields.js.
 * The main card database still classifies these cards as Magic
 * (Type 20); fieldList provides the additional Field designation.
 * ------------------------------------------------------------
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];


    var fieldListContainer = document.getElementById("field-list");
    var monsterFilterInput = document.getElementById("monster-filter");
    var monsterSearchBody = document.getElementById("monster-field-search-body");


    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&#039;");
    }


    function formatCardId(id) {
        return "#" + String(id).padStart(3, "0");
    }


    function formatBoldCardLabel(card) {
        return "<strong>" +
            escapeHTML(formatCardId(card.Id) + " " + card.Name) +
            "</strong>";
    }


    function getTypeName(typeId) {
        return cardTypes[typeId] || "Unknown";
    }


    function formatGuardianStar(value) {
        return starNames[value - 1] || starNames[0];
    }

    var guardianStarSymbols = {
        Sun: "☉", Mercury: "☿", Venus: "♀", Moon: "☾",
        Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "⛢",
        Neptune: "♆", Pluto: "♇"
    };

    function formatGuardianStarWithSymbol(value) {
        var name = formatGuardianStar(value);
        return (guardianStarSymbols[name] || "") + " " + name;
    }


    function formatMonsterSummary(card) {
        return (
            formatBoldCardLabel(card) +
            "<br>Type: " +
            escapeHTML(getTypeName(card.Type)) +
            " — Guardian Stars: " +
            escapeHTML(formatGuardianStarWithSymbol(card.GuardianStarA)) +
            " / " +
            escapeHTML(formatGuardianStarWithSymbol(card.GuardianStarB)) +
            " — " +
            escapeHTML(card.Attack) +
            "A / " +
            escapeHTML(card.Defense) +
            "D"
        );
    }


    function formatFieldCardSummary(card) {
        return formatBoldCardLabel(card);
    }


    /*
     * ------------------------------------------------------------
     * 1. CARD LOOKUP CACHE
     * ------------------------------------------------------------
     */

    var allCards = card_db().get();

    allCards.forEach(function (card) {
        cardById[card.Id] = card;
    });


    var monsterCards = allCards
        .filter(function (card) {
            return card.Type < 20;
        })
        .sort(function (a, b) {
            return a.Id - b.Id;
        });


    var monsterCardsByName = monsterCards.slice().sort(function (a, b) {
        var comparison = a.Name.localeCompare(b.Name);

        if (comparison !== 0) {
            return comparison;
        }

        return a.Id - b.Id;
    });


    /*
     * ------------------------------------------------------------
     * 2. BUILD FIELD STATISTICS
     * ------------------------------------------------------------
     */

    var fieldDefinitions = fieldList || [];

    fieldDefinitions.forEach(function (definition) {

        var fieldCard = cardById[definition.CardId];

        if (!fieldCard) {
            return;
        }

        var positiveTypeSet = {};
        definition.PositiveTypes.forEach(function (typeId) {
            positiveTypeSet[typeId] = true;
        });

        var negativeTypeSet = {};
        definition.NegativeTypes.forEach(function (typeId) {
            negativeTypeSet[typeId] = true;
        });

        var positiveCards = [];
        var neutralCards = [];
        var negativeCards = [];

        var positiveIdSet = {};
        var neutralIdSet = {};
        var negativeIdSet = {};

        var positiveGroupMap = {};
        var neutralGroupMap = {};
        var negativeGroupMap = {};

        monsterCards.forEach(function (card) {

            var isPositive = !!positiveTypeSet[card.Type];
            var isNegative = !!negativeTypeSet[card.Type];

            if (isPositive) {

                positiveCards.push(card);
                positiveIdSet[card.Id] = true;

                if (!positiveGroupMap[card.Type]) {
                    positiveGroupMap[card.Type] = [];
                }

                positiveGroupMap[card.Type].push(card);

            } else if (isNegative) {

                negativeCards.push(card);
                negativeIdSet[card.Id] = true;

                if (!negativeGroupMap[card.Type]) {
                    negativeGroupMap[card.Type] = [];
                }

                negativeGroupMap[card.Type].push(card);

            } else {

                neutralCards.push(card);
                neutralIdSet[card.Id] = true;

                if (!neutralGroupMap[card.Type]) {
                    neutralGroupMap[card.Type] = [];
                }

                neutralGroupMap[card.Type].push(card);

            }

        });

        function toGroupList(groupMap) {
            return Object.keys(groupMap)
                .map(function (typeId) {
                    var numericTypeId = parseInt(typeId, 10);
                    return {
                        typeId: numericTypeId,
                        typeName: getTypeName(numericTypeId),
                        cards: groupMap[typeId]
                    };
                })
                .sort(function (a, b) {
                    return a.typeName.localeCompare(b.typeName);
                });
        }

        statistics.push({
            definition: definition,
            card: fieldCard,
            attackBonus: definition.AttackBonus,
            defenseBonus: definition.DefenseBonus,
            attackPenalty: definition.AttackPenalty,
            defensePenalty: definition.DefensePenalty,

            positiveCards: positiveCards,
            neutralCards: neutralCards,
            negativeCards: negativeCards,

            positiveIdSet: positiveIdSet,
            neutralIdSet: neutralIdSet,
            negativeIdSet: negativeIdSet,

            positiveGroups: toGroupList(positiveGroupMap),
            neutralGroups: toGroupList(neutralGroupMap),
            negativeGroups: toGroupList(negativeGroupMap),

            positiveCount: positiveCards.length,
            neutralCount: neutralCards.length,
            negativeCount: negativeCards.length
        });

    });


    /*
     * ------------------------------------------------------------
     * 3. RANK LABELS
     * ------------------------------------------------------------
     */

    var positiveRankLabels = {};
    var neutralRankLabels = {};
    var negativeRankLabels = {};


    function calculateRankLabels(countProperty, targetLabels) {

        var sorted = statistics.slice().sort(function (a, b) {

            if (b[countProperty] !== a[countProperty]) {
                return b[countProperty] - a[countProperty];
            }

            return a.card.Id - b.card.Id;

        });


        var i = 0;

        while (i < sorted.length) {

            var count = sorted[i][countProperty];
            var startRank = i + 1;
            var j = i + 1;

            while (j < sorted.length && sorted[j][countProperty] === count) {
                j++;
            }

            var endRank = j;
            var label;

            if (startRank === endRank) {
                label = "Rank " + startRank;
            } else {
                label = "Rank " + startRank + "–" + endRank;
            }

            for (var k = i; k < j; k++) {
                targetLabels[sorted[k].card.Id] = label;
            }

            i = j;

        }

    }


    calculateRankLabels("positiveCount", positiveRankLabels);
    calculateRankLabels("neutralCount", neutralRankLabels);
    calculateRankLabels("negativeCount", negativeRankLabels);


    /*
     * ------------------------------------------------------------
     * 4. SORTING
     * ------------------------------------------------------------
     */

    function sortStatistics(results) {

        results.sort(function (a, b) {

            if (b.positiveCount !== a.positiveCount) {
                return b.positiveCount - a.positiveCount;
            }

            if (a.negativeCount !== b.negativeCount) {
                return a.negativeCount - b.negativeCount;
            }

            return a.card.Id - b.card.Id;

        });

    }


    function escapeSearchRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }


    function normalizeNumericTerm(value) {
        if (/^[0-9,.]+$/.test(value) && /[0-9]/.test(value)) {
            return value.replace(/[,.]/g, "");
        }

        return value;
    }


    function isNumericTerm(value) {
        return /^[0-9,.]+$/.test(value) && /[0-9]/.test(value);
    }


    function isSearchBoundary(cardName, index) {
        if (index === 0) {
            return true;
        }

        var previousCharacter = cardName.charAt(index - 1);

        return /\s/.test(previousCharacter) ||
            previousCharacter === "-" ||
            previousCharacter === ".";
    }


    function matchesNumericTerm(card, cardName, searchTerm) {

        var normalizedSearchTerm = normalizeNumericTerm(searchTerm);

        if (/^[0-9]+$/.test(searchTerm) && searchTerm.length <= 3) {

            var formattedId = String(card.Id).padStart(3, "0");
            var normalizedId = formattedId.replace(/^0+/, "") || "0";
            var normalizedIdSearch = normalizedSearchTerm.replace(/^0+/, "") || "0";

            if (normalizedId === normalizedIdSearch) {
                return true;
            }

        }

        var numericPattern = /[0-9][0-9,.]*/g;
        var match;

        while ((match = numericPattern.exec(cardName)) !== null) {

            if (
                !isSearchBoundary(cardName, match.index) &&
                cardName.charAt(match.index - 1) !== "#"
            ) {
                continue;
            }

            var normalizedNumber = normalizeNumericTerm(match[0]);

            if (normalizedNumber.indexOf(normalizedSearchTerm) === 0) {
                return true;
            }

        }

        return false;

    }


    function matchesSearchTerm(card, cardName, searchTerm, isStandaloneTerm) {

        if (isNumericTerm(searchTerm)) {
            return matchesNumericTerm(card, cardName, searchTerm);
        }

        if (isStandaloneTerm && searchTerm.length === 1) {

            if (cardName.indexOf(searchTerm) === 0) {
                return true;
            }

            if (searchTerm === "'") {
                return false;
            }

            if (!/[a-z0-9]/.test(searchTerm)) {
                return cardName.indexOf(searchTerm) !== -1;
            }

            var punctuationDelimitedPattern = new RegExp(
                "(^|\\s|[-.])" + escapeSearchRegExp(searchTerm) + "\\."
            );

            return punctuationDelimitedPattern.test(cardName);

        }

        if (!isStandaloneTerm && searchTerm === ".") {
            return false;
        }

        for (var i = 0; i < cardName.length; i++) {

            if (
                cardName.indexOf(searchTerm, i) === i &&
                isSearchBoundary(cardName, i)
            ) {
                return true;
            }

        }

        return false;

    }


    /*
     * ------------------------------------------------------------
     * 5. FIELD DETAIL SECTION BUILDER
     * ------------------------------------------------------------
     */

    function createEffectTable(title, cardList, effectText) {

        var wrapper = document.createElement("div");
        wrapper.className = "mb-4";

        var heading = document.createElement("h4");
        heading.className = "text-main my-4";
        heading.innerHTML = "<strong>" + title + "</strong>";
        wrapper.appendChild(heading);


        var table = document.createElement("table");
        table.className = "table table-striped table-bordered field-effect-table";

        var thead = document.createElement("thead");
        thead.innerHTML =
            "<tr>" +
            "<th>Card</th>" +
            "<th>Monster Type</th>" +
            "<th>Effect</th>" +
            "</tr>";
        table.appendChild(thead);


        var tbody = document.createElement("tbody");

        cardList.forEach(function (card) {

            var row = document.createElement("tr");

            var nameCell = document.createElement("td");
            nameCell.innerHTML = formatBoldCardLabel(card);

            var typeCell = document.createElement("td");
            typeCell.innerHTML = "<strong>" + getTypeName(card.Type) + "</strong>";

            var effectCell = document.createElement("td");
            effectCell.innerHTML = "<strong>" + effectText + "</strong>";
            effectCell.style.textAlign = "center";

            row.appendChild(nameCell);
            row.appendChild(typeCell);
            row.appendChild(effectCell);

            tbody.appendChild(row);

        });


        table.appendChild(tbody);
        wrapper.appendChild(table);

        return wrapper;

    }


    function createTypeGroupTable(title, groupList, effectText) {

        var wrapper = document.createElement("div");
        wrapper.className = "mb-4";

        var heading = document.createElement("h4");
        heading.className = "text-main my-4";
        heading.innerHTML = "<strong>" + title + "</strong>";
        wrapper.appendChild(heading);


        var table = document.createElement("table");
        table.className = "table table-striped table-bordered field-type-group-table";

        var thead = document.createElement("thead");
        thead.innerHTML =
            "<tr>" +
            "<th>Monster Type</th>" +
            "<th># of Cards Affected</th>" +
            "<th>Effect</th>" +
            "<th>Monster Cards</th>" +
            "</tr>";
        table.appendChild(thead);


        var tbody = document.createElement("tbody");

        groupList.forEach(function (group) {

            var row = document.createElement("tr");

            var typeCell = document.createElement("td");
            typeCell.innerHTML = "<strong>" + group.typeName + "</strong>";
            typeCell.className = "field-group-summary-cell";

            var countCell = document.createElement("td");
            countCell.innerHTML = "<strong>" + group.cards.length + "</strong>";
            countCell.className = "field-group-summary-cell";

            var effectCell = document.createElement("td");
            effectCell.innerHTML = "<strong>" + effectText + "</strong>";
            effectCell.className = "field-group-summary-cell field-group-effect-cell";
            effectCell.style.textAlign = "center";

            var cardsCell = document.createElement("td");
            cardsCell.innerHTML = group.cards
                .map(function (card) {
                    return '<div class="field-group-card">' +
                        formatBoldCardLabel(card) +
                        '</div>';
                })
                .join("");

            row.appendChild(typeCell);
            row.appendChild(countCell);
            row.appendChild(effectCell);
            row.appendChild(cardsCell);

            tbody.appendChild(row);

        });


        table.appendChild(tbody);
        wrapper.appendChild(table);

        return wrapper;

    }


    function createFieldDetails(entry) {

        var wrapper = document.createElement("div");
        wrapper.className = "mt-3";


        var description = document.createElement("p");
        description.className = "text-center";
        description.innerHTML =
            "<strong>Positive: " + entry.positiveCount +
            " | Neutral: " + entry.neutralCount +
            " | Negative: " + entry.negativeCount + "</strong>";
        wrapper.appendChild(description);


        var note = document.createElement("p");
        note.className = "field-effect-note";
        note.innerHTML = buildFieldNote(entry);
        wrapper.appendChild(note);


        if (entry.positiveCards.length) {
            wrapper.appendChild(
                createEffectTable(
                    "Positive Card Effects",
                    entry.positiveCards,
                    getEffectText(entry, true)
                )
            );

            wrapper.appendChild(
                createTypeGroupTable(
                    "Positive Monster Type Groups",
                    entry.positiveGroups,
                    getEffectText(entry, true)
                )
            );
        }


        if (entry.neutralCards.length) {
            wrapper.appendChild(
                createEffectTable(
                    "Neutral Card Effects",
                    entry.neutralCards,
                    "0 ATK / 0 DEF"
                )
            );

            wrapper.appendChild(
                createTypeGroupTable(
                    "Neutral Monster Type Groups",
                    entry.neutralGroups,
                    "0 ATK / 0 DEF"
                )
            );
        }


        if (entry.negativeCards.length) {
            wrapper.appendChild(
                createEffectTable(
                    "Negative Card Effects",
                    entry.negativeCards,
                    getEffectText(entry, false)
                )
            );

            wrapper.appendChild(
                createTypeGroupTable(
                    "Negative Monster Type Groups",
                    entry.negativeGroups,
                    getEffectText(entry, false)
                )
            );
        }


        return wrapper;

    }


    /*
     * ------------------------------------------------------------
     * 6. RENDER EXPANDABLE FIELD LIST
     * ------------------------------------------------------------
     */

    function renderFields() {

        var results = statistics.slice();

        sortStatistics(results);

        fieldListContainer.innerHTML = "";


        results.forEach(function (entry) {

            var details = document.createElement("details");
            details.className = "mb-3 border rounded bg-white p-2";


            var summary = document.createElement("summary");
            summary.className = "font-weight-bold p-2";
            summary.style.cursor = "pointer";

            var positiveRank = positiveRankLabels[entry.card.Id] || "Rank -";
            var neutralRank = neutralRankLabels[entry.card.Id] || "Rank -";
            var negativeRank = negativeRankLabels[entry.card.Id] || "Rank -";

            summary.innerHTML =
                formatBoldCardLabel(entry.card) +
                " — + " + entry.positiveCount +
                " / ± " + entry.neutralCount +
                " / - " + entry.negativeCount +
                " | POSITIVE " + positiveRank.replace("Rank ", "Rank: ") +
                " / NEUTRAL " + neutralRank.replace("Rank ", "Rank: ") +
                " / NEGATIVE " + negativeRank.replace("Rank ", "Rank: ");

            details.appendChild(summary);
            details.appendChild(createFieldDetails(entry));

            fieldListContainer.appendChild(details);

        });

    }


    function getEffectText(entry, isPositive) {

        if (isPositive) {
            return "+" + entry.attackBonus + " ATK / +" + entry.defenseBonus + " DEF";
        }

        return "-" + entry.attackPenalty + " ATK / -" + entry.defensePenalty + " DEF";

    }


    function buildFieldNote(entry) {

        var parts = [];

        if (entry.definition.PositiveTypes.length) {
            var positiveNames = entry.definition.PositiveTypes
                .map(getTypeName)
                .join(", ");

            parts.push(
                "<strong>+" +
                entry.attackBonus +
                " ATK / +" +
                entry.defenseBonus +
                " DEF:</strong> " +
                escapeHTML(positiveNames)
            );
        }

        if (entry.definition.NegativeTypes.length) {
            var negativeNames = entry.definition.NegativeTypes
                .map(getTypeName)
                .join(", ");

            parts.push(
                "<strong>-" +
                entry.attackPenalty +
                " ATK / -" +
                entry.defensePenalty +
                " DEF:</strong> " +
                escapeHTML(negativeNames)
            );
        }

        return parts.join("<br>");

    }


    /*
     * ------------------------------------------------------------
     * 7. MONSTER FIELD SEARCH TABLE
     * ------------------------------------------------------------
     */

    function getFilteredMonsters() {

        var rawSearchText = monsterFilterInput.value.toLowerCase();
        var searchText = rawSearchText;


        if (searchText === "") {
            return [];
        }


        if (searchText.charAt(searchText.length - 1) === " ") {
            searchText = searchText.slice(0, -1);
        }


        if (
            searchText === "" ||
            searchText.charAt(0) === " " ||
            searchText.indexOf("  ") !== -1
        ) {
            return [];
        }


        var searchTerms = searchText.split(" ");
        var isStandaloneTerm = searchTerms.length === 1;


        return monsterCardsByName
            .filter(function (card) {

                var cardName = card.Name.toLowerCase();

                return searchTerms.every(function (searchTerm) {
                    return matchesSearchTerm(
                        card,
                        cardName,
                        searchTerm,
                        isStandaloneTerm
                    );
                });
            })
            .sort(function (a, b) {

                return a.Id - b.Id;

            });

    }


    function renderMonsterSearch() {

        var monsters = getFilteredMonsters();

        monsterSearchBody.innerHTML = "";


        if (!monsterFilterInput.value.trim()) {

            var emptySearchRow = document.createElement("tr");
            var emptySearchCell = document.createElement("td");

            emptySearchCell.colSpan = 4;
            emptySearchCell.className = "text-center";
            emptySearchCell.textContent = "Type a monster name to search.";

            emptySearchRow.appendChild(emptySearchCell);
            monsterSearchBody.appendChild(emptySearchRow);

            return;

        }


        if (!monsters.length) {

            var noResultsRow = document.createElement("tr");
            var noResultsCell = document.createElement("td");

            noResultsCell.colSpan = 4;
            noResultsCell.className = "text-center";
            noResultsCell.textContent = "No monster cards found.";

            noResultsRow.appendChild(noResultsCell);
            monsterSearchBody.appendChild(noResultsRow);

            return;

        }


        monsters.forEach(function (monsterCard) {

            var beneficialFields = [];
            var harmfulFields = [];

            statistics.forEach(function (entry) {

                if (entry.positiveIdSet[monsterCard.Id]) {
                    beneficialFields.push(entry.card);
                }

                if (entry.negativeIdSet[monsterCard.Id]) {
                    harmfulFields.push(entry.card);
                }

            });

            var row = document.createElement("tr");

            var nameCell = document.createElement("td");
            nameCell.innerHTML = formatBoldCardLabel(monsterCard);
            nameCell.style.verticalAlign = "middle";

            var typeCell = document.createElement("td");
            typeCell.innerHTML = "<strong>" + getTypeName(monsterCard.Type) + "</strong>";
            typeCell.style.verticalAlign = "middle";

            var beneficialCell = document.createElement("td");
            beneficialCell.style.verticalAlign = "middle";
            beneficialCell.innerHTML = beneficialFields.length
                ? beneficialFields
                    .map(function (fieldCard) {
                        return '<span class="field-positive">' +
                            formatFieldCardSummary(fieldCard) +
                            '</span>';
                    })
                    .join("<br>")
                : '<span style="display: block; text-align: center;">—</span>';

            var harmfulCell = document.createElement("td");
            harmfulCell.style.verticalAlign = "middle";
            harmfulCell.innerHTML = harmfulFields.length
                ? harmfulFields
                    .map(function (fieldCard) {
                        return '<span class="field-negative">' +
                            formatFieldCardSummary(fieldCard) +
                            '</span>';
                    })
                    .join("<br>")
                : '<span style="display: block; text-align: center;">—</span>';

            row.appendChild(nameCell);
            row.appendChild(typeCell);
            row.appendChild(beneficialCell);
            row.appendChild(harmfulCell);

            monsterSearchBody.appendChild(row);

        });

    }


    /*
     * ------------------------------------------------------------
     * 8. EVENTS
     * ------------------------------------------------------------
     */

    monsterFilterInput.addEventListener("input", renderMonsterSearch);


    renderFields();
    renderMonsterSearch();

})();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
