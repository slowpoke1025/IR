// Define the scaling factor
const scalingFactor = 1.3;
const width = 800;
const height = 600;
// Load the words from the CSV file
const color = d3.scaleSequential(d3.interpolateRainbow).domain([0, 12]);

const svg = d3
  .select(".front")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const wordGroups = {};
for (let i = 0; i < 13; i++) {
  wordGroups[i] = svg
    .append("g")
    .attr("class", `cloud cloud_${i}`)
    .attr("transform", `translate(${width / 2}, ${height / 2})`);
}

const clouds = [];

Promise.all([d3.csv("關鍵字.csv")]).then(([data1]) => {
  data1 = data1.map((d) => {
    if (d.Keyword == "美國" || d.Keyword == "中國") {
      d.Frequency = +d.Frequency * 0.5;
    }
    return d;
  });

  let w = d3.group(data1, (d) => d.Topic);
  let words = Array.from(w, ([k, v]) => v);

  const freq_extent = d3.extent(data1, (d) => +d.Frequency);

  const Size = d3
    .scaleLinear()
    .domain(freq_extent) // The extent of your data
    .range([12, 55]); // The desired range of output

  const layouts = {};
  words.forEach((d, i) => {
    let word = words[i].map((d) => ({
      text: d.Keyword,
      size: Size(+d.Frequency),
      topic: d.Topic,
    }));
    const layout = d3.layout
      .cloud()
      .size([200, 200])
      .words(word)
      .padding(4)
      .rotate(() => ~~(Math.random() * 2) * 90)
      .fontSize((d) => d.size)
      .on("end", draws(i));
    layouts[i] = layout;
    layout.start();
  });

  // Create the word cloud layout

  document.getElementById("back").addEventListener("click", () => {
    // Remove the "flipped" class from the word cloud
    d3.select("#word-cloud").classed("flipped", false);

    words.forEach((d, i) => {
      let wordGroup = wordGroups[i];

      wordGroup
        .selectAll("text")
        .transition()
        .duration(1000)
        .style("opacity", 1) // Make all words fully visible again
        .attr(
          "transform",
          (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
        ) // Reset to original position
        .style("font-size", (d) => `${d.size}px`) // Reset font size
        .style("fill", (d) => getColor(d))
        .on("end", function () {
          // Ensure all transitions are complete before re-enabling listeners
          // setTimeout(() => {
          wordGroup
            .selectAll("text")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("mouseenter", mouseenter);
          // }, 500); // Delay re-enabling listeners slightly to ensure smooth reset
        });
    });

    simulation.alpha(80).restart();
  });
});

function draws(i) {
  return function draw(words) {
    let wordGroup = wordGroups[i];

    const texts = wordGroup
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-size", (d) => `${d.size}px`)
      .style("fill", (d, i) => getColor(d)) // Color based on index in the dataset
      .attr("class", (d) => `text text${d.topic}`) // Add class based on topic
      .attr("text-anchor", "middle")
      .attr("transform", (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
      .text((d) => d.text)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("mouseenter", mouseenter)
      .on("click", async function (event, d) {
        // Scatter all words
        d3.select("#title").text(d.text);
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Move clicked word to the center of the page and scale it up

        d3.selectAll(".text")
          .on("mouseover", null)
          .on("mouseout", null)
          .on("mouseenter", null)

          .filter((e) => e != d) //e.topic != d.topic
          .transition()
          .duration(1000)
          .style("opacity", 0) // Fade out
          .attr("transform", function () {
            const randomX = Math.random() * (width - 100) - (width / 2 - 50);
            const randomY = Math.random() * (height - 100) - (height / 2 - 50);
            return `translate(${randomX}, ${randomY})`;
          })

          .on("end", function (e) {
            const wordCloudElement = d3.select("#word-cloud");
            wordCloudElement.classed("flipped", true);
            document.querySelector(".back").scrollTo({
              top: 0,
              behavior: "smooth", // Smooth scrolling effect
            });
          });

        d3.select(this)
          .transition()
          .duration(1000)
          //   .style("font-size", `${size(d.size)}px`) // Double the size
          .style("font-size", `${70}px`) // Increase size by 20%
          .attr("transform", `translate(${0}, ${d.size / 2})`) // Move to the center of the page
          .style("opacity", 1) // Ensure it stays visible
          .style("text-shadow", "none")
          .on("end", async function (d) {
            let sentences = await getSentences(d);
            const back = document.querySelector(".back");

            back.innerHTML = "";

            back.append(textDOM(`<h2 id="title">${d.text}</h2>`));

            const pies = await getPies(d.topic);

            const charts = getCharts();
            back.append(charts);
            const cards = document.querySelectorAll(".chart-card");
            cards.forEach((card, i) => {
              card.prepend(pies[i]);
            });
            sentences.forEach((d) => {
              group = createGroup(d);
              back.append(textDOM(group));
            });
          });
      });

    const bbox = texts.node().getBBox();
    const radius = Math.sqrt(bbox.width ** 2 + bbox.height ** 2) / 2;

    clouds.push({
      i,
      x: Math.random() * width,
      y: Math.random() * height,
      radius,
      texts,
    });

    if (clouds.length == 13) {
      simulateClouds();
    }
  };

  async function getSentences(d) {
    return await d3.csv("關鍵句.csv").then(function (data) {
      let sentences = d3.group(
        data,
        (d) => d["主題"]
        //   (d) => d["類別"]
      );

      return d3
        .rollups(
          sentences.get(d.topic),
          (v) => v,
          (v) => v["類別"]
        )
        .map(([type, items]) => ({ type, items }));
      // console.log(sentences.get(d.topic)[1], d.topic);
    });
  }

  // function createGroup({ type, items }) {

  //   const emo = {
  //     正面: "positive",
  //     中性: "neutral",
  //     負面: "negative",
  //   };
  //   let list = "";
  //   d3.sort(items, (d) => new Date(d["日期"])).forEach((d) => {
  //     list += `<li class="${emo[d["分類結果"]]}">
  //                   <a href="${d["URL"]}">
  //                   <span>${d["日期"]} ${d["來源"]}</span>${d["關鍵句"]}
  //                   </a>
  //                 </li>`;
  //   });
  //   return (
  //     `<div class="group">` +
  //     `<h3>${type}</h3>` +
  //     `<ul class="summary">` +
  //     list +
  //     `</ul>` +
  //     `</div>`
  //   );
  // }

  function createGroup({ type, items }) {
    const emo = {
      正面: "positive",
      中性: "neutral",
      負面: "negative",
    };
    let list = "";
    d3.sort(items, (d) => new Date(d["日期"])).forEach((d) => {
      list += `<li class="news-item ${emo[d["分類結果"]]}">
           <span>${d["日期"]} ${d["來源"]}</span>
                    <a href="${d["URL"]}">
                    <div class="news-content">${d["關鍵句"]}</div>
                    </a>
                  </li>`;
    });
    return (
      `<div class="group">` +
      `<h2 class="news-title">${type}</h2>` +
      `<ul class="news-list">` +
      list +
      `</ul>` +
      `</div>`
    );
  }

  // <div class="news-card">
  //   <h2 class="news-title">國際</h2>
  //   <ul class="news-list">
  //     <li class="news-item negative">
  //       <span class="news-meta">2024-10-03 BBC</span>
  //       <div class="news-content">
  //         以色列有哪些飛彈防禦系統：「鐵穹」、「大衛投石索」和「箭」式
  //       </div>
  //     </li>
  //   </ul>
  // </div>;

  function textDOM(str) {
    const htmlString = str;
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = htmlString;
    const domElement = tempContainer.firstChild; // Access the first DOM element
    return domElement;
  }

  function getCharts() {
    return textDOM(`<div class="charts">
      <div class="chart-card">
        <h4 class="chart-title">類別分佈</h4>
      </div>
    
      <div class="chart-card">
        <h4 class="chart-title">來源分佈</h4>
      </div>
    </div>;`);
  }
}
function getColor(d) {
  return color(+d.topic);
}

// function simulateClouds() {
//   // Calculate bounding boxes for each cloud group
//   const nodes = clouds.map((cloud) => ({
//     x: cloud.x,
//     y: cloud.y,
//     radius: cloud.radius,
//   }));

//   // Create a force simulation for the clouds
//   const simulation = d3
//     .forceSimulation(nodes)
//     .force(
//       "collision",
//       d3.forceCollide().radius((d) => d.radius + 40) // Add padding between clouds
//     )
//     .force("x", d3.forceX(width / 2).strength(0.05)) // Pull towards the center
//     .force("y", d3.forceY(height / 2).strength(0.05)) // Pull towards the center
//     .alpha(1)
//     .alphaDecay(0.02) // Gradual decay for natural motion

//     // .force("charge", d3.forceManyBody().strength(0.8)) // Nodes are attracted one each other of value is > 0
//     // .force("collide", d3.forceCollide().strength(0.5).radius(30).iterations(1)) // Force that avoids circle overlapping

//     .on("tick", () => {
//       clouds.forEach((cloud, i) => {
//         const node = nodes[i];

//         // Clamp the x and y positions within the box boundaries
//         node.x = Math.max(30, Math.min(width - 30, node.x));
//         node.y = Math.max(30, Math.min(height - 30, node.y));

//         // Sync cloud positions with node positions
//         cloud.x = node.x;
//         cloud.y = node.y;

//         // Update the position of the group element
//         wordGroups[cloud.i].attr(
//           "transform",
//           // `translate(${cloud.x - cloud.radius}, ${cloud.y + cloud.radius})`
//           `translate(${cloud.x}, ${cloud.y})`
//         );
//       });
//     });
// }
let simulation;

function simulateClouds() {
  const nodes = clouds.map((cloud) => ({
    x: cloud.x,
    y: cloud.y,
    radius: cloud.radius,
  }));
  const delta = 100;

  const drag = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

  // Add drag behavior to each word group
  clouds.forEach((cloud) => {
    wordGroups[cloud.i].call(drag);
  });

  simulation = d3
    .forceSimulation(nodes)
    .force(
      "collision",
      d3
        .forceCollide()
        .radius((d) => d.radius + 50)
        // .strength(0.9) // Reduce collision strength for smoother movement
        .iterations(3) // Increase iteration count for more accurate collisions
    )
    .force("center", d3.forceCenter(width / 2, height / 2).strength(1)) // Reduce center force
    .force("charge", d3.forceManyBody().strength(25)) // Nodes are attracted one each other of value is > 0

    .velocityDecay(0.3) // Lower value makes movement more fluid
    .alpha(20) // Lower initial alpha for gentler start
    .alphaDecay(0.01) // Slower decay for longer animation
    .alphaMin(0.001) // Lower minimum alpha to allow more movement
    .on("tick", () => {
      clouds.forEach((cloud, i) => {
        const node = nodes[i];
        // Add easing to boundary constraints
        node.x = Math.max(delta, Math.min(width - delta, node.x));
        node.y = Math.max(delta, Math.min(height - delta, node.y));

        // Use interpolation for smoother movement
        cloud.x += (node.x - cloud.x) * 0.1; // Easing factor
        cloud.y += (node.y - cloud.y) * 0.1;

        wordGroups[cloud.i].attr(
          "transform",
          `translate(${cloud.x}, ${cloud.y})`
        );
      });
    });

  // Drag functions
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    const i = +d3.select(this).attr("class").split("_")[1];
    const node = nodes[i];
    node.fx = node.x;
    node.fy = node.y;
  }

  function dragged(event) {
    const i = +d3.select(this).attr("class").split("_")[1];
    const node = nodes[i];
    node.fx = event.x;
    node.fy = event.y;
    clouds[i].x = event.x;
    clouds[i].y = event.y;
    d3.select(this).attr("transform", `translate(${event.x}, ${event.y})`);
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    const i = +d3.select(this).attr("class").split("_")[1];
    const node = nodes[i];
    node.fx = null;
    node.fy = null;
  }
}

// Features of the forces applied to the nodes:
function mouseover(e, d) {
  d3.select(this)
    .transition()
    .style("text-shadow", "2px 2px 3px rgba(0, 0, 0, 0.3)") // Add shadow effect
    .style("fill", (d) => getColor(d));
}
function mouseenter(e, d) {
  d3.selectAll(".text")
    .filter((v) => v.topic !== d.topic)
    .lower()
    .transition()
    .style("fill", "lightgrey");
  d3.selectAll(`.text_${d.topic}`).raise();
}
function mouseout(e, d) {
  // On mouseout, revert back to original size, remove stroke, and shadow
  d3.select(this)
    .transition()
    .style("font-size", (d) => `${d.size}px`) // Revert to original size
    .style("text-shadow", "none"); // Remove shadow effect

  d3.selectAll(".text")
    .filter((v) => v.topic !== d.topic)
    .transition()
    .style("fill", (d) => getColor(d));
}

async function getPies(i) {
  let data = await d3.csv("ratio.csv");
  data = data[+i];
  const keys_type = ["type_科技", "type_財經", "type_國際"];
  const keys_source = [
    "source_CNA",
    "source_NYC",
    "source_TECHNEWS",
    "source_BBC",
  ];

  const data_type = keys_type.map(function (k) {
    const label = k.split("_")[1];
    const value = +data[k] || 0;
    return { label, value };
  });

  const data_source = keys_source.map(function (k) {
    const label = k.split("_")[1];
    const value = +data[k] || 0;
    return { label, value };
  });

  return [createPie(data_type), createPie(data_source)];
}

function createPie(data) {
  const width = 200,
    height = 200,
    margin = 30;
  const radius = Math.min(width, height) / 2 - margin;

  // Tooltip reference
  const tooltip = d3.select("#tooltip");

  // Create SVG container
  const svg = d3
    //   .select("body")
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Create the pie generator
  const pie = d3.pie().value((d) => d.value);

  // Create the arc generator
  const arc = d3
    .arc()
    .innerRadius(0) // Pie chart (set > 0 for donut chart)
    .outerRadius(radius);

  // Highlight arc generator
  const arcHover = d3
    .arc()
    .innerRadius(0)
    .outerRadius(radius + 10); // Slightly larger radius for highlight

  // Generate the color scale
  const color = d3
    .scaleOrdinal()
    .domain(data.map((d) => d.label))
    .range(d3.schemeCategory10);

  // Bind data and create pie slices

  svg
    .selectAll("path")
    .data(pie(data))
    .join("path")
    .attr("d", arc)
    .attr("fill", (d) => color(d.data.label))
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .on("mouseover", function (event, d) {
      // Highlight the slice
      d3.select(this).transition().duration(200).attr("d", arcHover);
      console.log("first");
      // Show tooltip
      tooltip
        .style("display", "block")
        .html(
          `<strong>${d.data.label}</strong>: ${Math.round(
            d.data.value * 100,
            2
          )}%`
        );
    })
    .on("mousemove", (event) => {
      // Move tooltip with the mouse
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", function () {
      // Reset the slice
      d3.select(this).transition().duration(200).attr("d", arc);

      // Hide tooltip
      tooltip.style("display", "none");
    });

  return svg.node().parentElement;
}
