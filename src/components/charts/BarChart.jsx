import { useD3 } from "../../hooks/useD3";
import React from "react";
import * as d3 from "d3";
import "../../scss/components/_bar-chart.scss";

const BAR_PADDING = 0.1,
  CHART_MARGIN = {
    top: 40,
    right: 30,
    bottom: 130,
    left: 100,
  },
  COLOR = "indianred";

const BarChart = ({
  id,
  data,
  xAxisVals,
  yAxisVals,
  title,
  xTitle,
  yTitle,
  legend: legendHeading,
}) => {
  const ref = useD3(
    (svg) => {
      const boundingNodes = d3.select(`#${id}`).node().getBoundingClientRect(),
        HEIGHT = boundingNodes.height,
        WIDTH = boundingNodes.width,
        HALF_WIDTH = WIDTH / 2,
        HALF_HEIGHT = HEIGHT / 2;

      const xScale = d3
        .scaleBand()
        .domain(data.map((d) => d[xAxisVals]))
        .range([CHART_MARGIN.left, WIDTH - CHART_MARGIN.right])
        .padding(BAR_PADDING);

      const xAxis = (g) =>
        g
          .attr("transform", `translate(0,${HEIGHT - CHART_MARGIN.bottom})`)
          .style("color", COLOR)
          .style("font-size", "8px")
          .call(d3.axisBottom(xScale).tickSizeOuter(0))
          .selectAll("text")
          .attr("transform", "translate(-10,50)rotate(-25)");

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d[yAxisVals])])
        .range([HEIGHT - CHART_MARGIN.bottom, CHART_MARGIN.top]);

      const yAxis = (g) =>
        g
          .attr("transform", `translate(${CHART_MARGIN.left},0)`)
          .style("color", COLOR)
          .call(d3.axisLeft(yScale).ticks(null, "s"))
          .call((g) => g.select(".domain").remove())
          .call((g) =>
            g
              .append("text")
              .attr("x", -CHART_MARGIN.left)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text(data.y)
          );

      var tooltip = d3.select(`#${id} .tooltip-area`).style("opacity", 0);

      const mouseover = (event, d) => {
        tooltip.style("opacity", 1);
      };

      const mousemove = (event, d) => {
        const text = d3.select(`#${id} .tooltip-area__text`);
        text.text(
          `${yAxisVals}: ${d[yAxisVals]} ${xAxisVals}: ${d[xAxisVals]} `
        );
        const [x, y] = d3.pointer(event);
        tooltip.attr("transform", `translate(${x}, ${y})`);
      };
      d3.select(".tooltip-area__text").style("fill", "#2a0303");

      var legendItemSize = 12;
      var legend = svg.select("#legend");
      legend
        .append("rect")
        .attr("width", legendItemSize)
        .attr("height", legendItemSize)
        .style("fill", COLOR)
        .attr("transform", `translate(${WIDTH - CHART_MARGIN.bottom},19)`);
      legend
        .append("text")
        .attr("x", WIDTH - 110)
        .attr("y", 30)
        .text((d) => legendHeading);

      svg.select(".x-axis").call(xAxis);
      svg.select(".y-axis").call(yAxis);

      svg
        .select(`#${id} .plot-area`)
        .attr("fill", COLOR)
        .selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d[xAxisVals]))
        .attr("width", xScale.bandwidth())
        .attr("y", (d) => yScale(d[yAxisVals]))
        .attr("height", (d) => yScale(0) - yScale(d[yAxisVals]))
        .on("mousemove", mousemove)
        .on("mouseover", mouseover);

      svg
        .append("text")
        .attr("x", HALF_WIDTH + 40)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .text(title);

      svg
        .append("text")
        .attr("text-anchor", "end")
        .attr("y", "5%")
        .attr("x", -HALF_HEIGHT + 120)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text(yTitle);

      svg
        .append("text")
        .attr("text-anchor", "end")
        .attr("y", HEIGHT - 20)
        .attr("x", HALF_WIDTH + 50)
        .attr("dy", ".75em")
        .text(xTitle);
    },
    [data.length]
  );

  return (
    <div id={id} className="bar-chart">
      <svg ref={ref} className="bar-chart__container">
        <g className="plot-area" />
        <g className="x-axis" />
        <g className="y-axis" />
        <g className="tooltip-area">
          <text className="tooltip-area__text"></text>
        </g>
        <g id="legend"></g>
      </svg>
    </div>
  );
};

export default BarChart;
