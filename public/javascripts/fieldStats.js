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
     * 1. CARD LOOKUP
     * ------------------------------------------------------------
     */

    var allCards = card_db().get();


    allCards.forEach(function (card) {

        cardById[card.Id] = card;

    });


    function isMonster(card) {

        return !!card && card.Type < 20;

    }


    var monsterCards = allCards.filter(function (card) {

        return isMonster(card);

    });

    var monsterCardsByName = monsterCards.slice().sort(function (a, b) {

        return a.Name.localeCompare(b.Name);

    });


    function getCardsForTypes(typeIds) {

        return monsterCardsByName.filter(function (card) {

            return typeIds.indexOf(card.Type) !== -1;

        });

    }


    function getTypeName(typeId) {

        if (cardTypes[typeId] === "Spellcaster") {
            return "Magic-User (Spellcaster)";
        }

        return cardTypes[typeId] || "Unknown";

    }


    function buildTypeGroups(cards) {

        var groups = {};


        cards.forEach(function (card) {

            if (!groups[card.Type]) {
                groups[card.Type] = [];
            }

            groups[card.Type].push(card);

        });


        return Object.keys(groups)
            .map(function (typeId) {

                return {
                    typeId: Number(typeId),
                    typeName: getTypeName(Number(typeId)),
                    cards: groups[typeId]
                };

            })
            .sort(function (a, b) {
                return a.typeName.localeCompare(b.typeName);
            });

    }


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
         * identifies it as a Field card.
         */

        if (fieldCard.Type !== 20) {
            return;
        }


        var positiveCards = getCardsForTypes(definition.PositiveTypes);
        var negativeCards = getCardsForTypes(definition.NegativeTypes);
        var positiveIds = {};
        var negativeIds = {};


        positiveCards.forEach(function (card) {
            positiveIds[card.Id] = true;
        });


        negativeCards.forEach(function (card) {
            negativeIds[card.Id] = true;
        });


        var neutralCards = monsterCardsByName
            .filter(function (card) {

                return !positiveIds[card.Id] && !negativeIds[card.Id];

            })
            .sort(function (a, b) {

                return a.Name.localeCompare(b.Name);

            });


        var statistic = {
            card: fieldCard,
            positiveCards: positiveCards,
            neutralCards: neutralCards,
            negativeCards: negativeCards,
            positiveCount: positiveCards.length,
            neutralCount: neutralCards.length,
            negativeCount: negativeCards.length,
            nonNeutralCount: positiveCards.length + negativeCards.length,
            positiveIdSet: positiveIds,
            negativeIdSet: negativeIds,
            positiveGroups: buildTypeGroups(positiveCards),
            neutralGroups: buildTypeGroups(neutralCards),
            negativeGroups: buildTypeGroups(negativeCards),
            bonus: definition.Bonus
        };

        statistics.push(statistic);

    });


    /*
     * ------------------------------------------------------------
     * 3. RANK LABELS
     * ------------------------------------------------------------
     */

    var positiveRankLabels = {};
    var neutralRankLabels = {};
    var negativeRankLabels = {};


    function calculateRankLabels(propertyName, destination) {

        var rankedResults = statistics.slice();


        rankedResults.sort(function (a, b) {

            if (b[propertyName] !== a[propertyName]) {
                return b[propertyName] - a[propertyName];
            }

            return a.card.Name.localeCompare(b.card.Name);

        });


        var i = 0;


        while (i < rankedResults.length) {

            var count = rankedResults[i][propertyName];
            var startRank = i + 1;
            var j = i + 1;


            while (
                j < rankedResults.length &&
                rankedResults[j][propertyName] === count
            ) {

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
                destination[rankedResults[k].card.Id] = label;
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

            return a.card.Id - b.card.Id;

        });

    }


    /*
     * ------------------------------------------------------------
     * 5. EFFECT HELPERS
     * ------------------------------------------------------------
     */

    function getEffect(entry, monsterCard) {

        var bonus = entry.bonus;

        if (entry.positiveIdSet[monsterCard.Id]) {
            return {
                label: "Positive",
                change: "+" + bonus + " ATK/DEF"
            };
        }


        if (entry.negativeIdSet[monsterCard.Id]) {
            return {
                label: "Negative",
                change: "-" + bonus + " ATK/DEF"
            };
        }


        return {
            label: "Neutral",
            change: "No effect."
        };

    }


    function getEffectText(entry, isPositive) {

        var amount = String(entry.bonus);

        return isPositive
            ? "+" + amount + " ATK/DEF"
            : "-" + amount + " ATK/DEF";

    }


    function buildFieldNote(entry) {

        var positiveNames = entry.positiveGroups
            .map(function (group) {
                return group.typeName;
            })
            .join(", ");

        var negativeNames = entry.negativeGroups
            .map(function (group) {
                return group.typeName;
            })
            .join(", ");

        var notes = [];

        if (positiveNames) {
            notes.push(
                "<strong>All " + escapeHTML(positiveNames) +
                " Monsters gain " + entry.bonus + " ATK/DEF.</strong>"
            );
        }

        if (negativeNames) {
            notes.push(
                "<strong>All " + escapeHTML(negativeNames) +
                " Monsters lose " + entry.bonus + " ATK/DEF.</strong>"
            );
        }

        return notes.join("<br>");

    }


    function createEffectTable(title, cards, effectText) {

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

        ["Monster Card", "Monster Type", "Effect"].forEach(function (text) {

            var th = document.createElement("th");
            th.textContent = text;
            headerRow.appendChild(th);

        });

        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");


        cards.forEach(function (card) {

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
        description.textContent =
            "Positive: " + entry.positiveCount +
            " | Neutral: " + entry.neutralCount +
            " | Negative: " + entry.negativeCount;
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
