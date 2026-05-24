async function init_biofabric(){
    let data = await fetch('coauthors_years.json').then(res => res.json());
    console.log(data.coauthors);

    let margin = {top: 20, right: 20, bottom: 100, left: 100};
    let width = 1200 - margin.left - margin.right;
    let height = 600 - margin.top - margin.bottom;

    // append svg to body
    let svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // make a yscale for years
    let years = d3.range(2018, 2027);

    let yScale = d3.scaleBand()
        .domain(years)
        .range([0, height])
        .padding(0.1);

    // // make an xscale for coauthors
    let coauthors = Object.keys(data.coauthors).reverse();

    // sort coatuthors by year of first publication
    coauthors.sort((a, b) => {
        let aYears = data.coauthors[a].map(pub => pub.year);
        let bYears = data.coauthors[b].map(pub => pub.year);
        let aFirst = Math.min(...aYears);
        let bFirst = Math.min(...bYears);
        return aFirst - bFirst;
    });

    let xScale = d3.scaleBand()
        .domain(coauthors)
        .range([0, width])
        .padding(0.1);

    // make a thin vertical line for each coauthor
    for (let coauthor of coauthors) {

            let x = xScale(coauthor) + xScale.bandwidth() / 2;
            let y1 = yScale(2018);
            let y2 = yScale(2026) + yScale.bandwidth();
            svg.append("line")
                .attr("x1", x)
                .attr("y1", y1)
                .attr("x2", x)
                .attr("y2", y2)
                .attr("stroke", "#eee")
                .attr("stroke-width", 2);
        // }
    }

    // draw y axis
    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale).tickFormat(d3.format("d")));

    // // draw x axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
      .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dx", "-0.8em")
        .attr("dy", "0.15em");

    

    // draw vertical lines
    for (let coauthor of coauthors) {
        let yearsWithPubs = [];
        for (let year = 2018; year <= 2026; year++) {
            let publications = data.coauthors[coauthor].filter(pub => pub.year === year);
            if (publications.length > 0) {
                yearsWithPubs.push(year);
            }
        }
        if (yearsWithPubs.length > 1) {
            let firstYear = yearsWithPubs[0];
            let lastYear = yearsWithPubs[yearsWithPubs.length - 1];
            let x = xScale(coauthor) + xScale.bandwidth() / 2;
            let y1 = yScale(firstYear) + yScale.bandwidth() / 2;
            let y2 = yScale(lastYear) + yScale.bandwidth() / 2;
            svg.append("line")
                .attr("x1", x)
                .attr("y1", y1)
                .attr("x2", x)
                .attr("y2", y2)
                .attr("stroke", "black")
                // .style("stroke-dasharray", ("3, 3"))
                .attr("stroke-width", 2);
        }
    }   

    // draw circles for each coauthor-year
    for (let coauthor of coauthors) {
        let positions = [];
        for (let year = 2018; year <= 2026; year++) {
            let publications = data.coauthors[coauthor].filter(pub => pub.year === year);
            
            if (publications.length === 0) continue;
            let cx = xScale(coauthor) + xScale.bandwidth() / 2;
            let cy = yScale(year) + yScale.bandwidth() / 2;
            positions.push([cx, cy]);
        }
        positions.forEach(([px, py]) => {
            svg.append('circle')
                .attr('cx', px)
                .attr('cy', py)
                .attr('r', 5)
                .attr('fill', 'black')
                .attr('class', 'bar');
        });
    }
}

async function biofabric2(){
    let coauthordata = await fetch('coauthors_years.json').then(res => res.json());
    let publicationdata = await fetch('publications_year_coauthors.json').then(res => res.json());
    let affiliations = await fetch('affiliations.json').then(res => res.json());

    // make y axis with coauthors
    let coauthors = Object.keys(coauthordata.coauthors).reverse();

    // sort coatuthors by year of first publication
    coauthors.sort((a, b) => {
        let aYears = coauthordata.coauthors[a].map(pub => pub.year);
        let bYears = coauthordata.coauthors[b].map(pub => pub.year);
        let aFirst = Math.min(...aYears);
        let bFirst = Math.min(...bYears);
        return aFirst - bFirst;
    });

    let margin = {top: 20, right: 20, bottom: 100, left: 200};
    let width = 1000 - margin.left - margin.right;
    let height = 900 - margin.top - margin.bottom;

    // append svg to body
    let svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let yScale = d3.scaleBand()
        .domain(coauthors)
        .range([0, height])
        .padding(0.1);

    // draw a faint horizontal line for each coauthor
    for (let coauthor of coauthors) {
        let y = yScale(coauthor) + yScale.bandwidth() / 2;
        let x1 = 0;
        let x2 = width;
        // Count number of publications with this coauthor
        let pubCount = coauthordata.coauthors[coauthor].length;
        let strokeWidth = pubCount > 2 ? 5 : 2;
        svg.append("line")
            .attr("x1", x1)
            .attr("y1", y)
            .attr("x2", x2)
            .attr("y2", y)
            .style("stroke-linecap", "round")
            .attr("stroke", pubCount > 2 ? "#ddd" : "#efefef")
            .attr("stroke-width", strokeWidth);
    }

    // append yscale
    // Sanitize coauthor names for axis labels and make text bold
    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(-10,0)")
        .call(d3.axisLeft(yScale).tickFormat(d => {
            // Replace HTML entities
            let name = d.replace("&#252;", "ü").replace("&#246;", "ö")
                .replace("&#228;", "ä").replace("&#237;", "í").replace("&#233;", "é").replace("&#243;", "ó").replace(" 0001", "");
            return name;
        }))
        .selectAll(".tick text")
        .style("font-weight", "bold"); // Make axis text bold

    svg.selectAll(".y.axis .domain").remove(); // Remove the vertical bar

    // for every affiliation, assign a color
    // let affiliationColors = {};
    let colorScale = country => {
        if (country === "US") return "#1f77b4"; // blue
        if (country === "AT") return "#d62728"; // red
        if (country === "IT") return "#2ca02c"; // green
        if (country === "DE") return "#ffd700"; // yellow
        return "#ccc"; // default gray
    };
    let affiliationList = Object.keys(affiliations);

    // // draw dots for every coauthor with the color of their affiliation
    for (let coauthor of coauthors) {
        // Check if affiliations[coauthor] exists before using it
        let fillColor = "#ccc";
        if (affiliations[coauthor]) {
            fillColor = colorScale(affiliations[coauthor].country);
        }

        svg.append("circle")
            .attr("cx", -10)
            .attr("cy", yScale(coauthor) + yScale.bandwidth() / 2)
            .attr("r", 4)
            .attr("fill", fillColor);
    }

    // make a little legend for the colors of the dots at the bottom of the visualization
    let legendData = [
        {country: "US", label: "United States"},
        {country: "AT", label: "Austria"},
        {country: "IT", label: "Italy"},
        {country: "DE", label: "Germany"},
    ];
    let legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0,${height + 60})`);
        
    // Center the legend horizontally within the svg width
    let legendWidth = (legendData.length - 1) * 150 + 40;
    let legendOffset = (width - legendWidth) / 2;

    legend.selectAll("circle")
        .data(legendData)
        .enter()
        .append("circle")
        .attr("cx", (d, i) => legendOffset + i * 150)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", d => colorScale(d.country));
        
    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", (d, i) => legendOffset + i * 150 + 12)
        .attr("y", 4)
        .text(d => d.label)
        .attr("font-size", 12)
        .attr("fill", "#333")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif");

    // Remove horizontal ticks
    svg.selectAll(".y.axis .tick line").remove();
    
    // group publications by year
    let publications = publicationdata.publications;
    publications.sort((a, b) => a.year - b.year);

    // group by year
    let pubsByYear = d3.groups(publications, d => d.year);

    // flatten publications for xScale, but keep track of year groupings
    let pubIndices = [];
    let yearPositions = [];
    let idx = 0;
    for (let [year, pubs] of pubsByYear) {
        yearPositions.push({year, start: idx, count: pubs.length});
        for (let pub of pubs) {
            pubIndices.push(pub);
            idx++;
        }
    }

    let xScale = d3.scaleBand()
        .domain(d3.range(pubIndices.length))
        .range([0, width])
        .padding(0.1);

    // make vertical lines between years
    for (let {year, start, count} of yearPositions) {
        if (start > 0) {
            let x = xScale(start) - xScale.paddingInner() * xScale.bandwidth() / 2;
            svg.append("line")
                .attr("x1", x)
                .attr("y1", 0)
                .attr("x2", x)
                .attr("y2", height)
                // .style("stroke-dasharray", ("10,10"))
                .style("stroke-linecap", "round")
                .attr("stroke", "#ddd")
                .attr("stroke-width", 2);
        }
    }

    // // draw x axis (no ticks)
    // svg.append("g")
    //     .attr("class", "x axis")
    //     .attr("transform", `translate(0,${height})`)
    //     .call(d3.axisBottom(xScale).tickFormat(''));

    // draw circles and lines for each publication
    for (let i = 0; i < pubIndices.length; i++) {
        let pub = pubIndices[i];
        let x = xScale(i) + xScale.bandwidth() / 2;

        // draw vertical line that goes from the highest coauthor to the lowest coauthor
        let coauthorYs = pub.coauthors.map(coauthor => yScale(coauthor) + yScale.bandwidth() / 2);
        let yMin = Math.min(...coauthorYs);
        let yMax = Math.max(...coauthorYs);

        svg.append("line")
            .attr("x1", x)
            .attr("y1", yMin)
            .attr("x2", x)
            .attr("y2", yMax)
            .attr("stroke", "#333")
            .attr("stroke-width", pub.type === "minor" ? 3.5 : 5.5);

        for (let coauthor of pub.coauthors) {
            let y = yScale(coauthor) + yScale.bandwidth() / 2;
            svg.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", pub.type === "minor" ? 3.5 : 4.5)
                .attr("fill", "#333")
                .attr("stroke-width", 0);
        }

        
    }

    // write the year below the group
    for (let {year, start, count} of yearPositions) {
        let firstX = xScale(start) + xScale.bandwidth() / 2;
        let lastX = xScale(start + count - 1) + xScale.bandwidth() / 2;
        let midX = (firstX + lastX) / 2;
        svg.append("text")
            .attr("x", midX)
            .attr("y", height + 30)
            .attr("text-anchor", "middle")
            .attr("font-size", 14)
            .attr("fill", "#333")
            .style("font-family", "sans-serif")
            .style("font-weight", "bold")
            .text(year);
    }
}

biofabric2();

// init_biofabric();