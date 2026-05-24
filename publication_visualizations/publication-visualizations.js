(function () {
  if (!window.d3) {
    window.renderPublicationVisualizations = function () {
      for (const id of ["venue-visualization", "coauthor-visualization"]) {
        const container = document.getElementById(id);
        if (container) container.textContent = "Visualization could not be loaded.";
      }
    };
    return;
  }

  const dataRoot = "publication_visualizations/";
  const years = d3.range(2018, 2027);

  const venueData = {
    "IEEE Trans. Vis. Comput. Graph.": {
      displayName: "IEEE TVCG",
      type: "major",
    },
    "IEEE VIS (Short Papers)": {
      displayName: "IEEE VIS Short Papers",
      type: "short",
    },
    CHI: {
      displayName: "ACM CHI",
      type: "major",
    },
    "CHI Extended Abstracts": {
      displayName: "CHI Extended Abstracts",
      type: "extended",
    },
    "Comput. Graph. Forum": {
      displayName: "Computer Graphics Forum",
      type: "major",
    },
    "EuroVis (Short Papers)": {
      displayName: "EuroVis Short Papers",
      type: "short",
    },
    "Comput. Graph.": {
      displayName: "Computers & Graphics",
      type: "major",
    },
    GD: {
      displayName: "Graph Drawing",
      type: "minor",
    },
    "VISIGRAPP (1): GRAPP, HUCAPP, IVAPP": {
      displayName: "IVAPP",
      type: "minor",
    },
  };

  const excludedVenues = new Set([
    "CoRR",
    "VOILA@ISWC",
    "ISWC (P&D/Industry/BlueSky)",
    "ISWC (P&#38;D/Industry/BlueSky)",
  ]);

  function cleanName(name) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = name;
    return textarea.value.replace(" 0001", "");
  }

  function countryColor(country) {
    if (country === "US") return "#0072b2";
    if (country === "AT") return "#d55e00";
    if (country === "IT") return "#009e73";
    if (country === "DE") return "#cc79a7";
    return "#999";
  }

  function tooltip() {
    let node = d3.select(".publication-tooltip");
    if (node.empty()) {
      node = d3.select("body").append("div").attr("class", "publication-tooltip");
    }
    return node;
  }

  function showTooltip(event, text) {
    const rect = event.target.getBoundingClientRect();
    const x = event.pageX || window.scrollX + rect.left + rect.width / 2;
    const y = event.pageY || window.scrollY + rect.top + rect.height / 2;

    tooltip()
      .text(text)
      .style("opacity", 1)
      .style("left", `${x + 12}px`)
      .style("top", `${y + 12}px`);
  }

  function moveTooltip(event) {
    if (!event.pageX || !event.pageY) return;
    tooltip()
      .style("left", `${event.pageX + 12}px`)
      .style("top", `${event.pageY + 12}px`);
  }

  function hideTooltip() {
    tooltip().style("opacity", 0);
  }

  function venueKeyForPublication(publication) {
    if (publication.venue === "IEEE VIS (TVCG)") {
      return "IEEE Trans. Vis. Comput. Graph.";
    }

    const key = publication.dblpKey || "";
    if (key.startsWith("journals/tvcg/")) return "IEEE Trans. Vis. Comput. Graph.";
    if (key.startsWith("journals/cgf/")) return "Comput. Graph. Forum";
    if (key.startsWith("journals/cg/")) return "Comput. Graph.";
    if (key.startsWith("conf/chi/")) {
      return publication.title?.includes("Crowdsourcing Virtual Reality")
        ? "CHI Extended Abstracts"
        : "CHI";
    }
    if (key.startsWith("conf/visualization/")) return "IEEE VIS (Short Papers)";
    if (key.startsWith("conf/vissym/")) return "EuroVis (Short Papers)";
    if (key.startsWith("conf/gd/")) return "GD";
    if (key.startsWith("conf/visigrapp/")) return "VISIGRAPP (1): GRAPP, HUCAPP, IVAPP";
    if (key.startsWith("conf/semweb/")) return "ISWC (P&D/Industry/BlueSky)";
    if (key.startsWith("journals/corr/")) return "CoRR";
    return publication.venue || "";
  }

  function titleForPublication(publication) {
    return publication.title || `${publication.venue || "Publication"} (${publication.year})`;
  }

  function createSvg(selector, width, height) {
    const container = d3.select(selector);
    container.selectAll("*").remove();

    return container
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img");
  }

  async function renderVenueChart(selector) {
    const [data, publicationData] = await Promise.all([
      d3.json(`${dataRoot}dblp_venues_years.json`),
      d3.json(`${dataRoot}publications_year_coauthors.json`),
    ]);
    const margin = { top: 24, right: 24, bottom: 42, left: 340 };
    const width = 1040;
    const height = 430;
    const svg = createSvg(selector, width, height);
    const publicationsByVenueYear = d3.group(
      publicationData.publications,
      venueKeyForPublication,
      (publication) => publication.year
    );

    let venues = Object.keys(data).filter((venue) => !excludedVenues.has(venue));
    const orderedVenues = Object.keys(venueData)
      .filter((venue) => venues.includes(venue))
      .concat(venues.filter((venue) => !venueData[venue]))
      .reverse();

    const xScale = d3
      .scaleBand()
      .domain(years)
      .range([margin.left, width - margin.right])
      .padding(0.18);

    const yScale = d3
      .scaleBand()
      .domain(orderedVenues)
      .range([height - margin.bottom, margin.top])
      .padding(0.25);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
      .call((g) => g.selectAll(".domain").remove())
      .call((g) => g.selectAll(".tick line").attr("stroke-width", 2))
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("font-family", "Helvetica, Arial, sans-serif")
          .attr("font-weight", 700)
          .attr("font-size", 18)
      );

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(
        d3
          .axisLeft(yScale)
          .tickFormat((venue) => venueData[venue]?.displayName || venue)
      )
      .call((g) => g.selectAll(".domain, .tick line").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .attr("font-family", "Helvetica, Arial, sans-serif")
          .attr("font-weight", 700)
          .attr("font-size", 18)
      );

    for (const year of years) {
      const x = xScale(year) + xScale.bandwidth() / 2;
      svg
        .append("line")
        .attr("x1", x)
        .attr("y1", margin.top)
        .attr("x2", x)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#eee")
        .attr("stroke-dasharray", "5 8")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 2);
    }

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(orderedVenues);

    for (const venue of venues) {
      if (yScale(venue) === undefined) continue;

      svg
        .append("line")
        .attr("x1", margin.left)
        .attr("y1", yScale(venue) + yScale.bandwidth() / 2)
        .attr("x2", width - margin.right)
        .attr("y2", yScale(venue) + yScale.bandwidth() / 2)
        .attr("stroke", "#eee")
        .attr("stroke-dasharray", "5 8")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 2);

      for (const year of years) {
        const publications = data[venue].filter((publication) => publication.year === year);
        if (!publications.length) continue;

        const cx = xScale(year) + xScale.bandwidth() / 2;
        const cy = yScale(venue) + yScale.bandwidth() / 2;
        const radius = venueData[venue]?.type === "major" ? 9 : 7;
        const spacing = radius * 2.1;
        const cols = Math.ceil(Math.sqrt(publications.length));
        const rows = Math.ceil(publications.length / cols);

        const titledPublications = publicationsByVenueYear.get(venue)?.get(year) || [];

        publications.forEach((publication, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const px = cx + (col - (cols - 1) / 2) * spacing;
          const py = cy + (row - (rows - 1) / 2) * spacing;
          const title = titledPublications[index]
            ? titleForPublication(titledPublications[index])
            : `${venueData[venue]?.displayName || venue}, ${year}`;

          svg
            .append("circle")
            .attr("cx", px)
            .attr("cy", py)
            .attr("r", radius)
            .attr("fill", color(venue))
            .attr("tabindex", 0)
            .style("cursor", "default")
            .on("mouseenter", (event) => showTooltip(event, title))
            .on("mousemove", moveTooltip)
            .on("mouseleave", hideTooltip)
            .on("focus", (event) => showTooltip(event, title))
            .on("blur", hideTooltip);
        });
      }
    }
  }

  async function renderCoauthorChart(selector) {
    const [coauthorData, publicationData, affiliations] = await Promise.all([
      d3.json(`${dataRoot}coauthors_years.json`),
      d3.json(`${dataRoot}publications_year_coauthors.json`),
      d3.json(`${dataRoot}affiliations.json`),
    ]);

    const coauthors = Object.keys(coauthorData.coauthors).sort((a, b) => {
      const aFirst = d3.min(coauthorData.coauthors[a], (publication) => publication.year);
      const bFirst = d3.min(coauthorData.coauthors[b], (publication) => publication.year);
      return aFirst - bFirst || d3.ascending(cleanName(a), cleanName(b));
    });

    const margin = { top: 24, right: 24, bottom: 82, left: 225 };
    const rowHeight = 25;
    const width = 1080;
    const height = margin.top + margin.bottom + coauthors.length * rowHeight;
    const svg = createSvg(selector, width, height);
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yScale = d3
      .scaleBand()
      .domain(coauthors)
      .range([0, plotHeight])
      .padding(0.1);

    const publications = publicationData.publications.sort(
      (a, b) => d3.ascending(a.year, b.year) || d3.ascending(a.venue, b.venue)
    );
    const yearGroups = d3.groups(publications, (publication) => publication.year);
    const xScale = d3
      .scaleBand()
      .domain(d3.range(publications.length))
      .range([0, plotWidth])
      .padding(0.16);

    g.append("g")
      .attr("transform", "translate(-12,0)")
      .call(d3.axisLeft(yScale).tickFormat(cleanName))
      .call((axis) => axis.selectAll(".domain, .tick line").remove())
      .call((axis) =>
        axis
          .selectAll(".tick text")
          .attr("font-family", "Helvetica, Arial, sans-serif")
          .attr("font-size", 18)
          .attr("font-weight", 700)
      );

    for (const coauthor of coauthors) {
      const y = yScale(coauthor) + yScale.bandwidth() / 2;
      const publicationCount = coauthorData.coauthors[coauthor].length;

      g.append("line")
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", plotWidth)
        .attr("y2", y)
        .attr("stroke", publicationCount > 2 ? "#ddd" : "#eee")
        .attr("stroke-width", publicationCount > 2 ? 4 : 2)
        .attr("stroke-linecap", "round");

      g.append("circle")
        .attr("cx", -10)
        .attr("cy", y)
        .attr("r", 4)
        .attr("fill", countryColor(affiliations[coauthor]?.country));
    }

    let cursor = 0;
    for (const [year, yearPublications] of yearGroups) {
      if (cursor > 0) {
        const x = xScale(cursor) - 6;
        g.append("line")
          .attr("x1", x)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", plotHeight)
          .attr("stroke", "#ddd")
          .attr("stroke-width", 2)
          .attr("stroke-linecap", "round");
      }

      const firstX = xScale(cursor) + xScale.bandwidth() / 2;
      const lastX = xScale(cursor + yearPublications.length - 1) + xScale.bandwidth() / 2;
      g.append("text")
        .attr("x", (firstX + lastX) / 2)
        .attr("y", plotHeight + 30)
        .attr("text-anchor", "middle")
        .attr("font-family", "Helvetica, Arial, sans-serif")
        .attr("font-size", 18)
        .attr("font-weight", 700)
        .text(year);

      cursor += yearPublications.length;
    }

    publications.forEach((publication, index) => {
      const x = xScale(index) + xScale.bandwidth() / 2;
      const ys = publication.coauthors
        .filter((coauthor) => yScale(coauthor) !== undefined)
        .map((coauthor) => yScale(coauthor) + yScale.bandwidth() / 2);

      if (!ys.length) return;

      const title = publication.title || publication.venue || "publication";
      const strokeWidth = publication.type === "minor" ? 3.5 : 5.5;

      g.append("line")
        .attr("x1", x)
        .attr("y1", d3.min(ys))
        .attr("x2", x)
        .attr("y2", d3.max(ys))
        .attr("stroke", "#333")
        .attr("stroke-width", strokeWidth)
        .attr("tabindex", 0)
        .style("cursor", "default")
        .style("pointer-events", "stroke")
        .on("mouseenter", (event) => showTooltip(event, `${publication.year}: ${title}`))
        .on("mousemove", moveTooltip)
        .on("mouseleave", hideTooltip)
        .on("focus", (event) => showTooltip(event, `${publication.year}: ${title}`))
        .on("blur", hideTooltip);

      for (const coauthor of publication.coauthors) {
        if (yScale(coauthor) === undefined) continue;
        g.append("circle")
          .attr("cx", x)
          .attr("cy", yScale(coauthor) + yScale.bandwidth() / 2)
          .attr("r", publication.type === "minor" ? 3.5 : 4.5)
          .attr("fill", "#333")
          .attr("tabindex", 0)
          .style("cursor", "default")
          .on("mouseenter", (event) =>
            showTooltip(event, `${publication.year}: ${title} / ${cleanName(coauthor)}`)
          )
          .on("mousemove", moveTooltip)
          .on("mouseleave", hideTooltip)
          .on("focus", (event) =>
            showTooltip(event, `${publication.year}: ${title} / ${cleanName(coauthor)}`)
          )
          .on("blur", hideTooltip);
      }
    });

    const legend = g
      .append("g")
      .attr("transform", `translate(0,${plotHeight + 58})`);
    const legendData = [
      { country: "US", label: "United States" },
      { country: "AT", label: "Austria" },
      { country: "IT", label: "Italy" },
      { country: "DE", label: "Germany" },
      { country: "", label: "Other" },
    ];

    legendData.forEach((item, index) => {
      const x = index * 150;
      legend
        .append("circle")
        .attr("cx", x)
        .attr("cy", 0)
        .attr("r", 5)
        .attr("fill", countryColor(item.country));

      legend
        .append("text")
        .attr("x", x + 12)
        .attr("y", 4)
        .attr("font-family", "Helvetica, Arial, sans-serif")
        .attr("font-size", 16)
        .attr("font-weight", 700)
        .text(item.label);
    });
  }

  window.renderPublicationVisualizations = async function () {
    await Promise.all([
      renderVenueChart("#venue-visualization"),
      renderCoauthorChart("#coauthor-visualization"),
    ]);
  };
})();
