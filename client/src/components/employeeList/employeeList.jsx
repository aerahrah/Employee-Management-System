import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "../../api/employee";
import { useEffect, useState, useMemo } from "react";

const EmployeeList = ({ selectedId, setSelectedId, maxHeightClass }) => {
  const {
    data: employees,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });

  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // ✅ Set default only if no selectedId
  useEffect(() => {
    if (employees?.data?.length > 0 && !selectedId) {
      setSelectedId(employees.data[0]._id);
    }
  }, [employees, selectedId, setSelectedId]);

  // Get unique departments
  const departments = useMemo(() => {
    if (!employees?.data) return [];
    const unique = new Set(employees.data.map((emp) => emp.department));
    return ["all", ...unique];
  }, [employees]);

  // Filter + sort
  const filteredEmployees = useMemo(() => {
    if (!employees?.data) return [];

    return employees.data
      .filter((emp) => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(search.toLowerCase());
        const matchesDept =
          departmentFilter === "all" || emp.department === departmentFilter;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return sortOrder === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
  }, [employees, search, sortOrder, departmentFilter]);

  if (isLoading) return <div>Loading employees...</div>;
  if (isError) return <div>Failed to load employees.</div>;

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <input
          type="text"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded-md w-full"
        />
        {/* <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="border p-2 rounded-md w-32"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept === "all" ? "All Departments" : dept}
            </option>
          ))}
        </select> */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="border p-2 rounded-md"
        >
          <option value="asc">A–Z</option>
          <option value="desc">Z–A</option>
        </select>
      </div>

      {/* Employee List */}
      <ul
        className={`flex flex-col gap-2 overflow-y-auto p-2 ${maxHeightClass}`}
      >
        {filteredEmployees.map((item) => (
          <li
            className={`bg-white shadow-md p-3.5 rounded-sm cursor-pointer hover:bg-gray-100 ${
              selectedId === item._id ? "border border-blue-400" : ""
            }`}
            onClick={() => setSelectedId(item._id)}
            key={item._id}
          >
            {item.firstName} {item.lastName}{" "}
            <span className="text-sm text-gray-500">({item.department})</span>
          </li>
        ))}
        {filteredEmployees.length === 0 && (
          <li className="text-gray-500 italic">No employees found</li>
        )}
      </ul>
    </div>
  );
};

export default EmployeeList;
