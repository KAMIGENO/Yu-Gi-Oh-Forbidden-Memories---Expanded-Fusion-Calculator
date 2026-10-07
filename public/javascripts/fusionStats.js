/*
 * ------------------------------------------------------------
 * FILE: public/javascripts/fusionStats.js
 * ------------------------------------------------------------
 *
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
 * ------------------------------------------------------------
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
     * Example:
     *
     * Card A + Card B -> Result 1
     * Card A + Card B -> Result 2
     *
     * Card B is still only counted ONCE as a fusion partner.
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

    function sortStatistics(results) {

        var sortType = sortSelect.value;

        results.sort(function (a, b) {

            if (sortType === "count-desc") {

                if (b.count !== a.count) {
                    return b.count - a.count;
                }

                return a.card.Id - b.card.Id;

            }


            if (sortType === "count-asc") {

                if (a.count !== b.count) {
                    return a.count - b.count;
                }

                return a.card.Id - b.card.Id;

            }


            if (sortType === "id-asc") {

                return a.card.Id - b.card.Id;

            }


            if (sortType === "id-desc") {

                return b.card.Id - a.card.Id;

            }


            if (sortType === "name-desc") {

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

        /*
         * Rankings are always based on fusion-partner count,
         * regardless of the table's current display sort.
         */
        rankedResults.sort(function (a, b) {

            if (b.count !== a.count) {
                return b.count - a.count;
            }

            return a.card.Name.localeCompare(b.card.Name);

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
     * FILTERING
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
     * RENDER MAIN TABLE
     * ------------------------------------------------------------
     */

    function renderStatistics() {

        var results = getFilteredStatistics();

        sortStatistics(results);


        /*
         * Global ranks are calculated from the complete statistics set.
         * Filtering only changes which rows are visible.
         */

        var rankLabels = getGlobalRankLabels();


        tableBody.innerHTML = "";


        results.forEach(function (entry, index) {

            var row = document.createElement("tr");

            row.className = "fusion-stats-row";

            row.dataset.cardId = entry.card.Id;


            /*
             * Rank
             */

            var rankCell = document.createElement("td");

            rankCell.textContent = rankLabels[entry.card.Id];
            rankCell.style.verticalAlign = "middle";


            /*
             * Card name
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
     * RENDER CARD DETAILS
     * ------------------------------------------------------------
     *
     * Clicking a card in the statistics table shows every card
     * that it can fuse with and the resulting card.
     */

    function showCardDetails(cardId) {

        var entry = statistics.find(function (item) {

            return String(item.card.Id) === String(cardId);

        });


        if (!entry) {

            return;

        }


        detailsTitle.innerHTML =
            formatBoldCardLabel(entry.card) +
            "<br>" +
            entry.count +
            " Fusion Partners";


        detailsContainer.innerHTML = "";


        /*
         * Create the details table.
         */

        var table = document.createElement("table");

        table.className =
            "table table-striped table-bordered";


        /*
         * Table header.
         */

        var thead = document.createElement("thead");

        var headerRow = document.createElement("tr");

        var partnerHeader = document.createElement("th");

        partnerHeader.textContent = "Fusion Partner";

        var resultHeader = document.createElement("th");

        resultHeader.textContent = "Result";


        headerRow.appendChild(partnerHeader);
        headerRow.appendChild(resultHeader);

        thead.appendChild(headerRow);

        table.appendChild(thead);


        /*
         * Table body.
         */

        var tbody = document.createElement("tbody");


        /*
         * Get the fusion list for this card.
         */

        var fusionList = fusionsList[entry.card.Id];


        var detailEntries = [];

        if (fusionList) {

            fusionList.forEach(function (fusionEntry) {

                var partnerId = fusionEntry.card;

                detailEntries.push({
                    partnerCard: cardById[partnerId],
                    resultCard: cardById[fusionEntry.result],
                    isGlitch: false
                });

            });

        }


        (glitchFusionDetails[entry.card.Id] || []).forEach(function (glitchDetail) {

            detailEntries.push({
                partnerCard: cardById[glitchDetail.partnerId],
                resultCard: cardById[glitchDetail.resultId],
                isGlitch: true
            });

        });


        detailEntries.sort(function (a, b) {

            var idA = a.partnerCard ? a.partnerCard.Id : Infinity;
            var idB = b.partnerCard ? b.partnerCard.Id : Infinity;

            return idA - idB;

        });


        detailEntries.forEach(function (detail) {

            var row = document.createElement("tr");
            var partnerCell = document.createElement("td");
            var resultCell = document.createElement("td");

            if (detail.partnerCard) {
                partnerCell.innerHTML = formatCardCell(detail.partnerCard);
            } else {
                partnerCell.textContent = "Unknown Card";
            }

            if (detail.resultCard) {
                resultCell.innerHTML =
                    formatBoldCardLabel(detail.resultCard) +
                    (detail.isGlitch ? " <strong>(Glitch Fusion)</strong>" : "") +
                    "<br>" +
                    escapeHTML(formatCardDetails(detail.resultCard));
            } else {
                resultCell.textContent = "Unknown Result";
            }

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
