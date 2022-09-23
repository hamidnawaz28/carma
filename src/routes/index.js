import React from "react";
import { Home, Details, Stats, Fallback } from "../pages";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { urls } from "../utils/constants";

const RoutesCom = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={urls.HOME} element={<Home />} />
        <Route path={`${urls.DETAILS}/:movieId`} element={<Details />} />
        <Route path={urls.STATS} element={<Stats />} />
        <Route path="*" element={<Fallback />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RoutesCom;
