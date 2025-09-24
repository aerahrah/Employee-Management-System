import React from "react";

export const CardFull = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white h-142 p-4  rounded-md shadow-md w-full ${className}`}
    >
      {children || <p className="text-gray-400 text-center">Card Full</p>}
    </div>
  );
};

export const CardMd = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white h-142 p-4 rounded-md shadow-md w-120 ${className}`}
    >
      {children || <p className="text-gray-400 text-center">Card Medium</p>}
    </div>
  );
};

export const CardSm = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white h-142 p-4  rounded-md shadow-md w-96 ${className}`}
    >
      {children || <p className="text-gray-400 text-center">Card Small</p>}
    </div>
  );
};
