// LeaveCreditsRecords.jsx
import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { CardFull, CardMd } from "../../cardComponent";
import Breadcrumbs from "../../breadCrumbs";
import LeaveCreditsEmployeeList from "./LeaveCreditsEmployeeList";

const LeaveCreditsRecords = () => {
  const { id } = useParams();
  const hasSelection = Boolean(id);

  return (
    <div className="w-full min-w-0 pt-2">
      <div className="px-1">
        <Breadcrumbs rootLabel="home" rootTo="/app" />
      </div>

      <div className="flex flex-col xl:flex-row gap-3 h-[calc(100vh-3.5rem-2.25rem)] md:h-[calc(100vh-3.75rem-3.5rem)]">
        {/* LEFT CARD (List) */}
        <CardMd
          className={[
            hasSelection ? "hidden xl:flex" : "flex",
            "w-full xl:w-92",
            "h-full flex-col xl:sticky xl:top-20",
            "min-w-0",
          ].join(" ")}
        >
          <LeaveCreditsEmployeeList />
        </CardMd>

        {/* RIGHT CARD (Info/Edit) */}
        <CardFull
          className={[
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

export default LeaveCreditsRecords;
