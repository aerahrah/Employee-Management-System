import React from "react";
import { CardFull, CardMd } from "../cardComponent"; // Adjust path if necessary
import RevocationsList from "./revocationsList";
import Breadcrumbs from "../breadCrumbs"; // Adjust path if necessary
import { Outlet, useParams } from "react-router-dom";

const RevocationApprovals = () => {
  const { id } = useParams();
  const hasSelection = Boolean(id);

  return (
    <div className="w-full min-w-0 pt-2">
      {/* HEADER / BREADCRUMBS */}
      <div className="px-1">
        <Breadcrumbs rootLabel="home" rootTo="/app" />
      </div>

      <div className="flex flex-col xl:flex-row gap-3 h-[calc(100vh-3.5rem-2.25rem)] md:h-[calc(100vh-3.75rem-3.5rem)]">
        {/* LEFT CARD (List) */}
        <CardMd
          className={[
            // Mobile/Tablet: show list only when no selection
            hasSelection ? "hidden xl:flex" : "flex",
            // Desktop/Wide: fixed width card
            "w-full xl:w-92",
            // Keep your sticky behavior only for xl+
            "h-full flex-col xl:sticky xl:top-20",
            // Prevent overflow issues with fixed sidebar + fixed card widths
            "min-w-0",
          ].join(" ")}
        >
          <RevocationsList />
        </CardMd>

        {/* RIGHT CARD (Details via Outlet) */}
        <CardFull
          className={[
            // Mobile/Tablet: show details only when selection exists
            hasSelection ? "flex" : "hidden xl:flex",
            "flex-col w-full flex-1 min-w-0",
          ].join(" ")}
        >
          <Outlet />
        </CardFull>
      </div>
    </div>
  );
};

export default RevocationApprovals;
