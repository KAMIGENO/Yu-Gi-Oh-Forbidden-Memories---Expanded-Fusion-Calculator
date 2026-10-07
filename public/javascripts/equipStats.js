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


        var entry = {
            card: card,
            partnerIds: partnerIds,
            count: partnerIds.length
        };


        statistics.push(entry);
        statisticsById[card.Id] = entry;

    });


    /*
     * ------------------------------------------------------------
     * 4. DISPLAY HELPERS
     * ------------------------------------------------------------
     */

    function escapeHTML(text) {

        var div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;

    }


    function formatCardId(id) {

        return "#" + String(id).padStart(3, "0");

    }


    function getCardTypeName(card) {

        if (!card) {
            return "Unknown";
        }

        return cardTypes[card.Type] || "Unknown";

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


    function formatGuardianStars(card) {

        return formatGuardianStarWithSymbol(card.GuardianStarA) + " / " + formatGuardianStarWithSymbol(card.GuardianStarB);

    }


    function formatCardDetails(card) {

        if (!card) {
            return "";
        }

        var details = "Type: " + getCardTypeName(card);

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


    function formatCardLabel(card) {

        return formatCardId(card.Id) + " " + card.Name;

    }


    function formatBoldCardLabel(card) {

        return "<strong>" + escapeHTML(formatCardLabel(card)) + "</strong>";

    }


    function formatEquipDetailsSummary(card) {

        if (!card) {
            return "";
        }

        var details = escapeHTML(getCardTypeName(card));

        if (isMonster(card)) {
            details +=
                "<br>" +
                escapeHTML(
                    formatGuardianStars(card) +
                    " — " +
                    card.Attack +
                    "A / " +
                    card.Defense +
                    "D"
                );
        }

        return details;

    }


    function formatEquipTargetCell(card) {

        return (
            formatBoldCardLabel(card) +
            "<br>" +
            formatEquipDetailsSummary(card)
        );

    }


    /*
     * ------------------------------------------------------------
     * 5. SORTING
     * ------------------------------------------------------------
     */

    function sortStatistics(list) {

        var sortMode = sortSelect.value;


        list.sort(function (a, b) {

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

                var nameDescResult = b.card.Name.localeCompare(a.card.Name);

                if (nameDescResult !== 0) {
                    return nameDescResult;
                }

                return a.card.Id - b.card.Id;

            }


            /*
             * Default:
             * name-asc
             */

            var nameAscResult = a.card.Name.localeCompare(b.card.Name);

            if (nameAscResult !== 0) {
                return nameAscResult;
            }

            return a.card.Id - b.card.Id;

        });

    }


    /*
     * ------------------------------------------------------------
     * 6. RANK CALCULATION
     * ------------------------------------------------------------
     *
     * IMPORTANT:
     *
     * This is competition ranking.
     *
     * Example:
     *
     * Counts:
     *
     * 20
     * 19
     * 18
     * 18
     * 18
     * 18
     * 17
     *
     * Ranks:
     *
     * 1
     * 2
     * 3--6
     * 3--6
     * 3--6
     * 3--6
     * 7
     */

    function calculateGlobalRanks() {

        var rankedResults = statistics.slice();


        rankedResults.sort(function (a, b) {

            if (b.count !== a.count) {
                return b.count - a.count;
            }

            return a.card.Id - b.card.Id;

        });


        var rankLabels = {};
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
                label = "Rank " + startRank + "–" + endRank;
            }


            for (var k = i; k < j; k++) {
                rankLabels[rankedResults[k].card.Id] = label;
            }

            i = j;

        }

        return rankLabels;

    }


    /*
     * ------------------------------------------------------------
     * 7. FILTERING & SEARCH
     * ------------------------------------------------------------
     */

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

            if (
                formattedId.indexOf(searchTerm) === 0 ||
                normalizedId.indexOf(normalizedSearchTerm) === 0
            ) {
                return true;
            }

        }


        if (
            isNumericTerm(searchTerm) &&
            cardName.indexOf(normalizedSearchTerm) !== -1
        ) {
            return true;
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


    function getFilteredStatistics() {

        var rawSearchText = filterInput.value.toLowerCase();
        var trimmedSearchText = rawSearchText.trim();


        if (!trimmedSearchText) {
            return statistics.slice();
        }


        var searchTerms = trimmedSearchText.split(/\s+/);
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
     * 8. RENDER TABLE
     * ------------------------------------------------------------
     */

    function renderTable() {

        var results = getFilteredStatistics();


        if (!results.length) {

            tableBody.innerHTML =
                '<tr><td colspan="3" class="text-center">No equip cards found.</td></tr>';

            return;

        }


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
     * 9. RENDER EQUIP DETAILS
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
            '<span class="fusion-card-summary-secondary">' +
            escapeHTML(formatCardDetails(entry.card)) +
            "</span>";


        var partnerCards = entry.partnerIds
            .map(function (id) {
                return cardById[id];
            })
            .filter(Boolean);


        partnerCards.sort(function (a, b) {

            var nameResult = a.Name.localeCompare(b.Name);

            if (nameResult !== 0) {
                return nameResult;
            }

            return a.Id - b.Id;

        });


        if (!partnerCards.length) {

            detailsContainer.innerHTML =
                '<p class="text-center">No compatible monsters found.</p>';

            detailsSection.style.display = "block";

            return;

        }


        var table = document.createElement("table");

        table.className = "table table-striped table-bordered text-center";


        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        var th1 = document.createElement("th");
        th1.textContent = "Compatible Monsters";

        headerRow.appendChild(th1);
        thead.appendChild(headerRow);
        table.appendChild(thead);


        var tbody = document.createElement("tbody");


        partnerCards.forEach(function (monsterCard) {

            var row = document.createElement("tr");

            var cell = document.createElement("td");
            cell.className = "equip-monster-summary";
            cell.innerHTML = formatEquipTargetCell(monsterCard);

            row.appendChild(cell);
            tbody.appendChild(row);

        });


        table.appendChild(tbody);

        detailsContainer.innerHTML = "";
        detailsContainer.appendChild(table);

        detailsSection.style.display = "block";

    }


    /*
     * ------------------------------------------------------------
     * 10. EVENT LISTENERS
     * ------------------------------------------------------------
     */

    sortSelect.addEventListener("change", renderTable);
    filterInput.addEventListener("input", renderTable);


    tableBody.addEventListener("click", function (event) {

        var row = event.target.closest(".equip-stats-row");

        if (!row) {
            return;
        }

        var cardId = parseInt(row.dataset.cardId, 10);

        if (!cardId) {
            return;
        }

        showEquipDetails(cardId);

        detailsSection.scrollIntoView({ behavior: "smooth" });

    });


    /*
     * ------------------------------------------------------------
     * 11. INITIAL RENDER
     * ------------------------------------------------------------
     */

    globalRankLabels = calculateGlobalRanks();

    renderTable();

})();


/*
 * ------------------------------------------------------------
 * END OF FILE
 * ------------------------------------------------------------
 */
