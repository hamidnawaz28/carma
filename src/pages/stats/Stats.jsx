import React from "react";
import { useStats } from "../../hooks";
import { BarChart } from "../../components/charts";
import "../../scss/pages/stats.css";

const Stats = () => {
  const movieDetails = useStats();
  return (
    <div className="stats">
      <BarChart
        id="bar-chart-1"
        data={movieDetails}
        xAxisVals="title"
        yAxisVals="vote_average"
        title="Top 10 rated movies"
        xTitle={"Movies Title"}
        yTitle={"Average Rating"}
        legend="Rating"
      />
      <BarChart
        id="bar-chart-2"
        data={movieDetails}
        xAxisVals="title"
        yAxisVals="vote_count"
        title="Votes give to top 10 movies"
        xTitle={"Movies Title"}
        yTitle={"Total Votes"}
        legend="Votes"
      />
    </div>
  );
};

export default Stats;
