import EmployeeList from "../../employeeList/employeeList";

const CtoEmployeeListView = ({ setSelectedId }) => {
  return (
    <>
      <h1 className="text-xl font-semibold px-2 pb-2">Employees List</h1>
      <EmployeeList setSelectedId={setSelectedId} maxHeightClass="max-h-110" />
    </>
  );
};

export default CtoEmployeeListView;
