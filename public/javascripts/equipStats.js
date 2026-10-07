/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/equipStats.js
 * ------------------------------------------------------------
 *
 * Shows every Equip card ranked by the number of unique
 * monster cards it can be used with.
 *
 * Ranks are GLOBAL. Filtering changes which rows are visible,
 * but it does not recalculate a card's rank from the filtered
 * subset.
 * ------------------------------------------------------------
 */


/*
 * ------------------------------------------------------------
 * 1. INITIALIZATION
 * ------------------------------------------------------------
 */

(function () {

    "use strict";


    var cardById = {};
    var statistics = [];
    var statisticsById = {};
    var globalRankLabels = {};


    var sortSelect = document.getElementById("equip-sort");
    var filterInput = document.getElementById("equip-filter");
    var tableBody = document.getElementById("equip-stats-body");

    var detailsSection = document.getElementById("equip-details-section");
    var detailsTitle = document.getElementById("equip-details-title");
    var detailsContainer = document.getElementById("equip-details");


    var allCards = card_db().get();


    allCards.forEach(function (card) {

        cardById[card.Id] = card;

    });


    /*
     * ------------------------------------------------------------
     * 2. CARD TYPE HELPERS
     * ------------------------------------------------------------
     */

    function isMonster(card) {

        return !!card && card.Type < 20;

    }


    function isEquip(card) {

        return !!card && cardTypes[card.Type] === "Equip";

    }


    /*
     * ------------------------------------------------------------
     * 3. BUILD EQUIP STATISTICS
     *
     * Each Equip counts UNIQUE monster cards only.
     * ------------------------------------------------------------
     */

    allCards.forEach(function (card) {

        if (!isEquip(card)) {
            return;
        }


        var partnerIds = [];
        var seen = new Set();
        var equipList = equipsList[card.Id] || [];


        equipList.forEach(function (targetId) {

            var targetCard = cardById[targetId];

            if (!isMonster(targetCard)) {
                return;
            }

            if (seen.has(targetId)) {
                return;
            }

            seen.add(targetId);
            partnerIds.push(targetId);

        });


        var statistic = {
            card: card,
            partnerIds: partnerIds,
            count: partnerIds.length
        };

        statistics.push(statistic);
        statisticsById[card.Id] = statistic;

    });


    /*
     * ------------------------------------------------------------
     * 4. CALCULATE GLOBAL RANKS
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


    function formatBoldCardLabel(card) {
        return "<strong>" +
            escapeHTML(formatCardId(card.Id) + " " + card.Name) +
            "</strong>";
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
            escapeHTML(cardTypes[card.Type] || "Unknown") +
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


    function calculateGlobalRanks() {

        var rankedResults = statistics.slice();


        rankedResults.sort(function (a, b) {

            if (b.count !== a.count) {
                return b.count - a.count;
            }

            return a.card.Id - b.card.Id;

        });


        var i = 0;


        while (i < rankedResults.length) {

            var count = rankedResults[i].count;
            var startRank = i + 1;
            var j = i + 1;


            while (
                j < rankedResults.length &&
                rankedResults[j].count === count
            ) {

                j++;

            }


            var endRank = j;
            var label;


            if (startRank === endRank) {
                label = "Rank " + startRank;
            } else {
                label =
                    "Rank " +
                    startRank +
                    "–" +
                    endRank;
            }


            for (var k = i; k < j; k++) {
                globalRankLabels[rankedResults[k].card.Id] = label;
            }


            i = j;

        }

    }


    calculateGlobalRanks();


    /*
     * ------------------------------------------------------------
     * 5. SORTING
     * ------------------------------------------------------------
     */

    function sortStatistics(results) {

        var sortMode = sortSelect.value;


        results.sort(function (a, b) {

            if (sortMode === "count-desc") {

                if (b.count !== a.count) {
                    return b.count - a.count;
                }

                return a.card.Id - b.card.Id;
            }


            if (sortMode === "count-asc") {

                if (a.count !== b.count) {
                    return a.count - b.count;
                }

                return a.card.Id - b.card.Id;
            }


            if (sortMode === "id-asc") {
                return a.card.Id - b.card.Id;
            }


            if (sortMode === "id-desc") {
                return b.card.Id - a.card.Id;
            }


            if (sortMode === "name-desc") {

                var nameComparison = b.card.Name.localeCompare(a.card.Name);

                if (nameComparison !== 0) {
                    return nameComparison;
                }

                return b.card.Id - a.card.Id;
            }


            var nameComparison = a.card.Name.localeCompare(b.card.Name);

            if (nameComparison !== 0) {
                return nameComparison;
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
                "(^|\\s|[-.])" + escapeSearchRegExp(searchTerm) + "\\."
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


    /*
     * ------------------------------------------------------------
     * 6. FILTERING
     * ------------------------------------------------------------
     *
     * Filtering only controls visibility.
     * Global rank values are preserved.
     * ------------------------------------------------------------
     */

    function getFilteredStatistics() {

        var rawSearchText = filterInput.value.toLowerCase();
        var searchText = rawSearchText;

        if (searchText === "") {
            return statistics.slice();
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

        return statistics.filter(function (entry) {

            var cardName = entry.card.Name.toLowerCase();

            return searchTerms.every(function (searchTerm) {
                return matchesSearchTerm(
                    entry.card,
                    cardName,
                    searchTerm,
                    isStandaloneTerm
                );
            });

        });

    }

    /*
     * ------------------------------------------------------------
     * 7. RENDER MAIN TABLE
     * ------------------------------------------------------------
     */

    function renderStatistics() {

        var results = getFilteredStatistics();

        sortStatistics(results);

        tableBody.innerHTML = "";


        results.forEach(function (entry) {

            var row = document.createElement("tr");

            row.className = "equip-stats-row";
            row.dataset.cardId = entry.card.Id;


            var rankCell = document.createElement("td");
            rankCell.textContent = globalRankLabels[entry.card.Id];


            var nameCell = document.createElement("td");
            nameCell.innerHTML =
                formatBoldCardLabel(entry.card);


            var countCell = document.createElement("td");
            countCell.innerHTML = "<strong>" + entry.count + "</strong>";
            countCell.style.textAlign = "center";


            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(countCell);

            tableBody.appendChild(row);

        });




    }


    /*
     * ------------------------------------------------------------
     * 8. RENDER EQUIP DETAILS
     * ------------------------------------------------------------
     */

    function showEquipDetails(cardId) {

        var entry = statisticsById[cardId];


        if (!entry) {
            return;
        }


        detailsTitle.innerHTML =
            formatBoldCardLabel(entry.card) +
            "<br>" +
            entry.count +
            " Compatible Monsters";


        detailsContainer.innerHTML = "";


        var table = document.createElement("table");

        table.className = "table table-striped table-bordered";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");
        var monsterHeader = document.createElement("th");

        monsterHeader.textContent = "Compatible Monster";

        headerRow.appendChild(monsterHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");

        var monsterCards = entry.partnerIds
            .map(function (monsterId) {
                return cardById[monsterId];
            })
            .filter(function (monsterCard) {
                return !!monsterCard;
            });


        monsterCards.sort(function (a, b) {
            return a.Id - b.Id;
        });


        monsterCards.forEach(function (monsterCard) {

            var row = document.createElement("tr");
            var monsterCell = document.createElement("td");
            monsterCell.className = "equip-monster-summary";
            monsterCell.innerHTML = formatMonsterSummary(monsterCard);

            row.appendChild(monsterCell);
            tbody.appendChild(row);

        });


        table.appendChild(tbody);
        detailsContainer.appendChild(table);

        detailsSection.style.display = "";

        detailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /*
     * ------------------------------------------------------------
     * 9. EVENT HANDLERS
     * ------------------------------------------------------------
     */

    tableBody.addEventListener("click", function (event) {

        var row = event.target.closest(".equip-stats-row");

        if (!row) {
            return;
        }

        showEquipDetails(row.dataset.cardId);

    });


    sortSelect.addEventListener("change", function () {
        renderStatistics();
    });


    filterInput.addEventListener("input", function () {
        renderStatistics();
    });


    /*
     * ------------------------------------------------------------
     * 10. INITIAL RENDER
     * ------------------------------------------------------------
     */

    detailsSection.style.display = "none";

    renderStatistics();

})();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
