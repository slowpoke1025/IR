// Define the scaling factor
const scalingFactor = 1.3;
const width = 800;
const height = 500;
// Load the words from the CSV file
const color = d3.scaleSequential(d3.interpolateViridis).domain([0, 12]);

const svg = d3
  .select(".front")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const wordGroup = svg
  .append("g")
  .attr("transform", `translate(${width / 2}, ${height / 2})`);

Promise.all([d3.csv("關鍵字.csv")]).then(([data1]) => {
  let words = d3.rollups(
    data1,
    (v) => {
      const i = v.reduce((a, b) => (+b.Frequency > +a.Frequency ? b : a));
      return {
        sum: d3.sum(v, (d) => +d.Frequency), // Compute the total sum of `Frequency`
        max: +i.Frequency, // Maximum frequency
        topic: i.Topic, // Topic associated with the max frequency
        //   type: i.Topic,
      };
    },
    (d) => d.Keyword // Group by the `Keyword` column
  );

  const freq_extent = d3.extent(words, (d) => +d[1].sum);
  const Size = d3
    .scaleLinear()
    .domain(freq_extent) // The extent of your data
    .range([15, 70]); // The desired range of output
  words = words.map(([text, freq]) => ({
    text,
    size: Size(freq.sum),
    topic: freq.topic,
  }));

  // const freq_extent = d3.extent(data1, (d) => +d.Frequency);

  // const Size = d3
  //   .scaleLinear()
  //   .domain(freq_extent) // The extent of your data
  //   .range([10, 50]); // The desired range of output

  // let words = data1.map((d) => ({
  //   text: d.Keyword,
  //   size: Size(d.Frequency),
  //   topic: d.Topic,
  // }));

  // Create the word cloud layout
  const layout = d3.layout
    .cloud()
    .size([width, height])
    .words(words)
    .padding(5)
    .rotate(() => ~~(Math.random() * 2) * 90)
    .fontSize((d) => d.size)
    .on("end", draw);

  layout.start();

  document.getElementById("back").addEventListener("click", () => {
    // Remove the "flipped" class from the word cloud
    d3.select("#word-cloud").classed("flipped", false);

    wordGroup
      .selectAll("text")
      .transition()
      .duration(1000)
      .style("opacity", 1) // Make all words fully visible again
      .attr("transform", (d) => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`) // Reset to original position
      .style("font-size", (d) => `${d.size}px`) // Reset font size
      .style("fill", (d) => getColor(d))
      .on("end", function () {
        // Ensure all transitions are complete before re-enabling listeners
        setTimeout(() => {
          wordGroup
            .selectAll("text")
            .on("mouseover", function (event, d) {
              d3.select(this)
                .transition()
                .style("font-size", (d) => `${d.size * 1.2}px`)
                .style("text-shadow", "2px 2px 3px rgba(0, 0, 0, 0.3)")
                .style("fill", (d) => getColor(d));
            })
            .on("mouseout", function (event, d) {
              d3.select(this)
                .transition()
                .style("font-size", (d) => `${d.size}px`)
                .style("text-shadow", "none");
              wordGroup
                .selectAll("text")
                .filter((v) => v.topic !== d.topic)
                .transition()
                .style("fill", (d) => getColor(d));
            })
            .on("mouseenter", function (e, d) {
              wordGroup
                .selectAll("text")
                .filter((v) => v.topic !== d.topic)
                .lower()
                .transition()
                .style("fill", "lightgrey");
            });
        }, 500); // Delay re-enabling listeners slightly to ensure smooth reset
      });
  });
});

function draw(words) {
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
    .on("mouseover", function (event, d) {
      // On hover, increase the font size, add stroke, and shadow
      d3.select(this)
        .transition()
        .style("font-size", `${d.size * 1.2}px`) // Increase size by 20%
        .style("text-shadow", "2px 2px 3px rgba(0, 0, 0, 0.3)") // Add shadow effect
        .style("fill", (d) => getColor(d));
    })
    .on("mouseout", function (event, d) {
      // On mouseout, revert back to original size, remove stroke, and shadow
      d3.select(this)
        .transition()
        .style("font-size", (d) => `${d.size}px`) // Revert to original size
        .style("text-shadow", "none"); // Remove shadow effect
      texts
        .filter((v) => v.topic !== d.topic)
        .transition()
        .style("fill", (d) => getColor(d));
    })
    .on("mouseenter", function (e, d) {
      texts
        .filter((v) => v.topic !== d.topic)
        .lower()
        .transition()
        .style("fill", "lightgrey");
    })
    .on("click", function (event, d) {
      // Scatter all words

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      // Move clicked word to the center of the page and scale it up

      wordGroup
        .selectAll("text")
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
          let groups = "";
          const back = document.querySelector(".back");

          sentences.forEach((d) => {
            groups += createGroup(d);
          });
          back.innerHTML = groups;
        });
    });
}

async function getSentences(d) {
  return await d3.csv("關鍵句.csv").then(function (data) {
    console.log(d.topic);
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

const emo = {
  正面: "positive",
  中性: "neutral",
  負面: "negative",
};
function createGroup({ type, items }) {
  let list = "";
  console.log(items);
  d3.sort(items, (d) => new Date(d["日期"])).forEach((d) => {
    list += `<li class="${emo[d["分類結果"]]}">
                  <a href="${d["URL"]}">
                  <span>${d["日期"]} ${d["來源"]}</span>${d["關鍵句"]}
                  </a>
                </li>`;
  });
  return (
    `<div class="group">` +
    `<h3>${type}</h3>` +
    `<ul class="summary">` +
    list +
    `</ul>` +
    `</div>`
  );
}

function getColor(d) {
  return color(+d.topic);
}
