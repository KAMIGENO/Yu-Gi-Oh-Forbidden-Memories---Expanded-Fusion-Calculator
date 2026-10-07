/*
 * Fusion Statistics
 *
 * Shows every card ranked by the number of unique cards
 * it can fuse with.
 *
 * Ranking uses competition ranking:
 *
 * Rank 1
 * Rank 2--3
 * Rank 2--3
 * Rank 4
 * Rank 5--7
 * Rank 5--7
 * Rank 5--7
 * Rank 8--9
 * Rank 8--9
 * Rank 10
 * Rank 11
 *
 * Ties therefore occupy all of the positions in the tie,
 * and the next rank skips those positions.
 */

(function () {

    "use strict";

    var cardById = {};
    var cardByName = {};
    var glitchFusionDetails = {};
    var statistics = [];

    var sortSelect = document.getElementById("fusion-sort");
    var filterInput = document.getElementById("fusion-filter");
    var tableBody = document.getElementById("fusion-stats-body");

    var detailsSection = document.getElementById("fusion-details-section");
    var detailsTitle = document.getElementById("fusion-details-title");
    var detailsContainer = document.getElementById("fusion-details");


    /*
     * ------------------------------------------------------------
     * BUILD CARD LOOKUP
     * ------------------------------------------------------------
     */

    card_db().get().forEach(function (card) {

        cardById[card.Id] = card;
        cardByName[card.Name] = card;

    });


    /*
     * ------------------------------------------------------------
     * BUILD GLITCH FUSION LOOKUP
     * ------------------------------------------------------------
     */

    glitchFusions.forEach(function (fusion) {

        var card1 = cardByName[fusion.card1];
        var card2 = cardByName[fusion.card2];
        var result = cardByName[fusion.result];

        if (!card1 || !card2 || !result) {
            return;
        }

        if (!glitchFusionDetails[card1.Id]) {
            glitchFusionDetails[card1.Id] = [];
        }

        glitchFusionDetails[card1.Id].push({
            partnerId: card2.Id,
            resultId: result.Id
        });

        if (!glitchFusionDetails[card2.Id]) {
            glitchFusionDetails[card2.Id] = [];
        }

        glitchFusionDetails[card2.Id].push({
            partnerId: card1.Id,
            resultId: result.Id
        });

    });


    /*
     * ------------------------------------------------------------
     * BUILD FUSION STATISTICS
     * ------------------------------------------------------------
     *
     * For each card, count the number of UNIQUE cards that
     * it can fuse with.
     *
     * In this game, a fusion takes two cards and produces
     * a result card. We want to know how many cards can be
     * combined with the given card.
     */

    fusionsList.forEach(function (fusionList, cardId) {

        var partners = new Set();

        if (fusionList) {

            fusionList.forEach(function (fusion) {

                /*
                 * Each fusion entry is an object containing
                 * the partner card ID and the result card ID.
                 *
                 * fusionsList is an array, so the second
                 * forEach argument is only the array index.
                 * Using it as the partner ID incorrectly adds
                 * index 0 as "Unknown Card" and breaks result
                 * lookups.
                 */

                partners.add(fusion.card);

            });

        }

        (glitchFusionDetails[cardId] || []).forEach(function (glitchDetail) {

            partners.add(glitchDetail.partnerId);

        });

        var card = cardById[cardId];

        if (!card) {
            return;
        }

        var partnerIds = Array.from(partners);

        statistics.push({
            card: card,
            partnerIds: partnerIds,
            count: partnerIds.length
        });

    });


    /*
     * ------------------------------------------------------------
     * DISPLAY HELPERS
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


    function isMonster(card) {

        return !!card && card.Type < 20;

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


    function formatCardCell(card) {
        return (
            formatBoldCardLabel(card) +
            "<br>" +
            escapeHTML(formatCardDetails(card))
        );
    }


    /*
     * ------------------------------------------------------------
     * SORTING
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
     * RANK CALCULATION
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

    function getGlobalRankLabels() {

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

            /*
             * Only cards with the same fusion count are tied.
             */

            var count = rankedResults[i].count;


            /*
             * Array indexes start at zero,
             * but ranks start at one.
             */

            var startRank = i + 1;

            var j = i + 1;


            /*
             * Find the end of this group of tied cards.
             */

            while (
                j < rankedResults.length &&
                rankedResults[j].count === count
            ) {

                j++;

            }


            /*
             * j is one position past the final tied card.
             *
             * Therefore j is also the final rank
             * occupied by this tie.
             */

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


            /*
             * Give every tied card the same rank label.
             */

            for (var k = i; k < j; k++) {

                rankLabels[rankedResults[k].card.Id] = label;

            }


            /*
             * Continue with the next group.
             */

            i = j;

        }

        return rankLabels;

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


        /*
         * Single-character query
         */
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


        /*
         * Standalone period
         */
        if (!isStandaloneTerm && searchTerm === ".") {
            return false;
        }


        /*
         * Substring search
         */
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
     * FILTER
     * ------------------------------------------------------------
     */

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
     * RENDER STATISTICS TABLE
     * ------------------------------------------------------------
     */

    function renderStatistics() {

        var results = getFilteredStatistics();

        var globalRankLabels = getGlobalRankLabels();


        sortStatistics(results);

        tableBody.innerHTML = "";


        if (results.length === 0) {

            tableBody.innerHTML =
                '<tr><td colspan="3" class="text-center">No cards found.</td></tr>';

            return;

        }


        results.forEach(function (entry) {

            var row = document.createElement("tr");

            row.className = "fusion-stats-row";

            row.dataset.cardId = entry.card.Id;


            /*
             * Global rank
             */

            var rankCell = document.createElement("td");

            rankCell.textContent = globalRankLabels[entry.card.Id];
            rankCell.style.verticalAlign = "middle";


            /*
             * Card name and details
             */

            var nameCell = document.createElement("td");

            nameCell.innerHTML = formatCardCell(entry.card);
            nameCell.style.verticalAlign = "middle";


            /*
             * Number of fusion partners
             */

            var countCell = document.createElement("td");

            countCell.innerHTML = "<strong>" + entry.count + "</strong>";
            countCell.style.textAlign = "center";
            countCell.style.verticalAlign = "middle";


            row.appendChild(rankCell);
            row.appendChild(nameCell);
            row.appendChild(countCell);


            tableBody.appendChild(row);

        });

    }


    /*
     * ------------------------------------------------------------
     * RENDER DETAILS
     * ------------------------------------------------------------
     */

    function showCardDetails(cardId) {

        var card = cardById[cardId];

        if (!card) {
            return;
        }


        /*
         * Title
         */

        detailsTitle.innerHTML =
            formatBoldCardLabel(card) +
            "<br>" +
            '<span class="fusion-card-summary-secondary">' +
            escapeHTML(formatCardDetails(card)) +
            "</span>";


        detailsContainer.innerHTML = "";


        /*
         * Build list of fusions
         */

        var fusions = [];

        var seenFusions = new Set();


        var cardFusions = fusionsList[card.Id];

        if (cardFusions) {

            cardFusions.forEach(function (fusion) {

                var key = fusion.card + "-" + fusion.result;

                if (!seenFusions.has(key)) {

                    seenFusions.add(key);

                    fusions.push({
                        partner: cardById[fusion.card],
                        result: cardById[fusion.result]
                    });

                }

            });

        }


        (glitchFusionDetails[card.Id] || []).forEach(function (glitchDetail) {

            var key = glitchDetail.partnerId + "-" + glitchDetail.resultId;

            if (!seenFusions.has(key)) {

                seenFusions.add(key);

                fusions.push({
                    partner: cardById[glitchDetail.partnerId],
                    result: cardById[glitchDetail.resultId]
                });

            }

        });


        if (fusions.length === 0) {

            detailsContainer.innerHTML =
                '<p class="text-center">No fusions found.</p>';

            detailsSection.style.display = "";

            return;

        }


        /*
         * Sort fusions by partner name, then by result name.
         */

        fusions.sort(function (a, b) {

            var partnerNameCompare =
                a.partner.Name.localeCompare(b.partner.Name);

            if (partnerNameCompare !== 0) {

                return partnerNameCompare;

            }


            return a.result.Name.localeCompare(b.result.Name);

        });


        /*
         * Build table
         */

        var table = document.createElement("table");

        table.className = "table table-striped table-bordered text-center";


        var thead = document.createElement("thead");

        thead.className = "thead-dark";

        thead.innerHTML =
            "<tr>" +
            "<th>Fusion Partner</th>" +
            "<th>Result</th>" +
            "</tr>";

        table.appendChild(thead);


        var tbody = document.createElement("tbody");


        fusions.forEach(function (fusion) {

            var row = document.createElement("tr");


            var partnerCell = document.createElement("td");
            var resultCell = document.createElement("td");


            partnerCell.innerHTML = formatCardCell(fusion.partner);

            resultCell.innerHTML = formatCardCell(fusion.result);


            partnerCell.style.verticalAlign = "middle";
            resultCell.style.verticalAlign = "middle";


            row.appendChild(partnerCell);
            row.appendChild(resultCell);
            tbody.appendChild(row);

        });





        table.appendChild(tbody);

        detailsContainer.appendChild(table);


        /*
         * Show the details section.
         */

        detailsSection.style.display = "";


        /*
         * Scroll to the details.
         */

        detailsSection.scrollIntoView({

            behavior: "smooth",
            block: "start"

        });

    }


    /*
     * ------------------------------------------------------------
     * TABLE CLICK HANDLER
     * ------------------------------------------------------------
     */

    tableBody.addEventListener("click", function (event) {

        var row =
            event.target.closest(".fusion-stats-row");


        if (!row) {

            return;

        }


        showCardDetails(row.dataset.cardId);

    });


    /*
     * ------------------------------------------------------------
     * SORT CHANGE
     * ------------------------------------------------------------
     */

    sortSelect.addEventListener("change", function () {

        renderStatistics();

    });


    /*
     * ------------------------------------------------------------
     * SEARCH FILTER
     * ------------------------------------------------------------
     */

    filterInput.addEventListener("input", function () {

        renderStatistics();

    });


    /*
     * ------------------------------------------------------------
     * INITIALIZE
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
