import React from "react";
import { CardFull } from "./cardComponent"; // Adjust import path as needed

const FullHeightCardContainer = ({ children }) => {
  return (
    <div className="w-[100%] flex gap-3 h-[calc(100vh-3.5rem)] md:h-[calc(55rem)] lg:h-[calc(50rem)]">
      <CardFull className="flex flex-col flex-1 min-h-0 min-w-0">
        {children}
      </CardFull>
    </div>
  );
};

export default FullHeightCardContainer;
