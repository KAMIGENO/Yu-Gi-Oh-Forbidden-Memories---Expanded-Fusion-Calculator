/* --- FILE: public/javascripts/fieldStats.js --- */
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


    function formatFieldCardSummary(card) {
        return (
            formatBoldCardLabel(card) +
            "<br><span style=\"font-weight: normal;\">Type: Magic (Field)</span>"
        );
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
     * 2. BUILD FIELD STATISTICS FROM data/fields.js
     * ------------------------------------------------------------
     */

    fieldList.forEach(function (definition) {

        var fieldCard = cardById[definition.CardId];


        if (!fieldCard) {
            return;
        }


        /*
         * A Field card must remain a Magic card in the main card
         * database. fieldList is the additional designation that
         * records its identity and its field effects.
         */
        var attackBonus = definition.Bonus || 500;
        var defenseBonus = definition.Bonus || 500;
        var attackPenalty = definition.Penalty || 500;
        var defensePenalty = definition.Penalty || 500;

        var positiveTypes = definition.PositiveTypes || [];
        var negativeTypes = definition.NegativeTypes || [];

        var positiveCards = [];
        var neutralCards = [];
        var negativeCards = [];

        var positiveIdSet = {};
        var neutralIdSet = {};
        var negativeIdSet = {};

        var positiveGroupMap = {};
        var neutralGroupMap = {};
        var negativeGroupMap = {};


        monsterCardsByName.forEach(function (card) {

            var type = card.Type;


            if (positiveTypes.indexOf(type) !== -1) {

                positiveCards.push(card);
                positiveIdSet[card.Id] = true;

                if (!positiveGroupMap[type]) {
                    positiveGroupMap[type] = [];
                }

                positiveGroupMap[type].push(card);

            } else if (negativeTypes.indexOf(type) !== -1) {

                negativeCards.push(card);
                negativeIdSet[card.Id] = true;

                if (!negativeGroupMap[type]) {
                    negativeGroupMap[type] = [];
                }

                negativeGroupMap[type].push(card);

            } else {

                neutralCards.push(card);
                neutralIdSet[card.Id] = true;

                if (!neutralGroupMap[type]) {
                    neutralGroupMap[type] = [];
                }

                neutralGroupMap[type].push(card);

            }

        });


        function toGroupList(groupMap) {

            return Object.keys(groupMap).map(function (typeIdString) {

                var typeId = Number(typeIdString);

                return {
                    typeId: typeId,
                    typeName: cardTypes[typeId] || "Unknown",
                    cards: groupMap[typeId]
                };

            }).sort(function (a, b) {

                return a.typeName.localeCompare(b.typeName);

            });

        }


        statistics.push({
            card: fieldCard,
            definition: definition,

            attackBonus: attackBonus,
            defenseBonus: defenseBonus,
            attackPenalty: attackPenalty,
            defensePenalty: defensePenalty,

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
     * 3. RANK CALCULATIONS
     * ------------------------------------------------------------
     */

    var positiveRankLabels = {};
    var neutralRankLabels = {};
    var negativeRankLabels = {};


    function calculateRankLabels(countProperty, rankLabelsMap, sortDescending) {

        var sorted = statistics.slice().sort(function (a, b) {

            var diff = sortDescending
                ? b[countProperty] - a[countProperty]
                : a[countProperty] - b[countProperty];

            if (diff !== 0) {
                return diff;
            }

            return a.card.Id - b.card.Id;

        });

        var valueGroups = [];
        var currentValue = null;
        var currentGroup = null;


        sorted.forEach(function (entry) {

            var value = entry[countProperty];

            if (value !== currentValue) {

                currentGroup = {
                    value: value,
                    entries: []
                };

                valueGroups.push(currentGroup);
                currentValue = value;

            }

            currentGroup.entries.push(entry);

        });


        var runningPosition = 1;


        valueGroups.forEach(function (group) {

            var groupSize = group.entries.length;
            var rankText;


            if (groupSize === 1) {
                rankText = "Rank " + runningPosition;
            } else {
                rankText = "Rank " + runningPosition + "–" + (runningPosition + groupSize - 1);
            }


            group.entries.forEach(function (entry) {
                rankLabelsMap[entry.card.Id] = rankText;
            });

            runningPosition += groupSize;

        });

    }


    calculateRankLabels("positiveCount", positiveRankLabels, true);
    calculateRankLabels("neutralCount", neutralRankLabels, true);
    calculateRankLabels("negativeCount", negativeRankLabels, true);


    /*
     * ------------------------------------------------------------
     * 4. SORT FIELD STATISTICS
     * ------------------------------------------------------------
     */

    function sortStatistics(results) {

        results.sort(function (a, b) {

            /* Primary sort: most positive cards first */
            if (b.positiveCount !== a.positiveCount) {
                return b.positiveCount - a.positiveCount;
            }

            /* Secondary sort: fewest negative cards first */
            if (a.negativeCount !== b.negativeCount) {
                return a.negativeCount - b.negativeCount;
            }

            /* Tertiary sort: most neutral cards first */
            if (b.neutralCount !== a.neutralCount) {
                return b.neutralCount - a.neutralCount;
            }

            /* Tie-breaker: lowest card ID first */
            return a.card.Id - b.card.Id;

        });

    }


    /*
     * ------------------------------------------------------------
     * 5. DISPLAY HELPERS
     * ------------------------------------------------------------
     */

    function getTypeName(typeId) {
        return cardTypes[typeId] || "Unknown";
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


    function createEffectTable(title, cardList, effectText) {

        var wrapper = document.createElement("div");
        wrapper.className = "mb-5";


        var heading = document.createElement("h4");
        heading.className = "text-main my-4";
        heading.innerHTML = "<strong>" + title + "</strong>";
        wrapper.appendChild(heading);


        var table = document.createElement("table");
        table.className = "table table-striped table-bordered field-effect-table";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        ["Card", "Monster Type", "Effect"].forEach(function (text) {

            var th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);
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


    function createTypeGroupTable(title, groups, effectText) {

        var wrapper = document.createElement("div");
        wrapper.className = "mb-5";


        var heading = document.createElement("h4");
        heading.className = "text-main my-4";
        heading.innerHTML = "<strong>" + title + "</strong>";
        wrapper.appendChild(heading);


        var table = document.createElement("table");
        table.className = "table table-striped table-bordered field-type-group-table";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        ["Monster Type", "# of Cards Affected", "Effect", "Affected Cards"].forEach(function (text) {

            var th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");

        groups.forEach(function (group) {

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
                .map(formatBoldCardLabel)
                .join(", ");

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


        wrapper.appendChild(
            createEffectTable(
                "Neutral Card Effects",
                entry.neutralCards,
                "No effect."
            )
        );

        wrapper.appendChild(
            createTypeGroupTable(
                "Neutral Monster Type Groups",
                entry.neutralGroups,
                "No effect."
            )
        );


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
            details.className = "mb-3 card p-3 shadow-sm";

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


    /*
     * ------------------------------------------------------------
     * 7. MONSTER SEARCH
     * ------------------------------------------------------------
     */

    function escapeRegExp(value) {

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


        /*
         * Card IDs are displayed as exactly three digits (for example,
         * 007, 030, and 300). A numeric search may therefore use 1, 2,
         * or 3 digits and still match the corresponding ID prefix. A
         * four-or-more-digit query is not allowed to collapse leading
         * zeroes, so 0007 does not become 7 and match card 007.
         */
        if (/^[0-9]+$/.test(searchTerm) && searchTerm.length <= 3) {

            var formattedId = String(card.Id).padStart(3, "0");
            var normalizedId = formattedId.replace(/^0+/, "") || "0";

            /* Card ID searches are exact after ignoring leading zeroes.
             * For example, 7, 07, and 007 all mean card ID 007, but 70
             * and 700 are different IDs and must not match. */
            var normalizedIdSearch = normalizedSearchTerm.replace(/^0+/, "") || "0";

            if (normalizedId === normalizedIdSearch) {
                return true;
            }

        }


        /*
         * Numeric text in the actual card name is searched separately
         * from the card ID. This includes numbers after a # in the name,
         * such as "#1", and numbers containing grouping punctuation.
         */
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


        /* A single-character search normally searches only the beginning
         * of the entire card name. A punctuation-delimited token such as
         * "D." is also searchable by its first character, but the character
         * after that punctuation is not treated as a one-character boundary.
         */
        if (isStandaloneTerm && searchTerm.length === 1) {

            if (cardName.indexOf(searchTerm) === 0) {
                return true;
            }

            /* Every punctuation character is searchable by itself except
             * apostrophe. Apostrophe is intentionally literal and therefore
             * requires additional surrounding search text. */
            if (searchTerm === "'") {
                return false;
            }

            if (!/[a-z0-9]/.test(searchTerm)) {
                return cardName.indexOf(searchTerm) !== -1;
            }

            var punctuationDelimitedPattern = new RegExp(
                "(^|\\s|[-.])" + escapeRegExp(searchTerm) + "\\."
            );

            return punctuationDelimitedPattern.test(cardName);

        }


        /* A period can be searched by itself, but not as one component
         * of a multi-term query (for example, "the ."). */
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


    function getFilteredMonsters() {

        var rawSearchText = monsterFilterInput.value.toLowerCase();
        var searchText = rawSearchText;


        if (searchText === "") {
            return [];
        }


        /* One trailing space is tolerated. Other spaces remain literal,
         * so consecutive internal/trailing spaces do not collapse. */
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
                    .map(formatFieldCardSummary)
                    .join("<br>")
                : '<span style="display: block; text-align: center;">—</span>';

            var harmfulCell = document.createElement("td");
            harmfulCell.style.verticalAlign = "middle";
            harmfulCell.innerHTML = harmfulFields.length
                ? harmfulFields
                    .map(formatFieldCardSummary)
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
