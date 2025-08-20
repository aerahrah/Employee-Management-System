import { useQuery } from "@tanstack/react-query";
import { getEmployeeById } from "../../api/employee";

const EmployeeInformation = ({ selectedId }) => {
  const {
    data: employee,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["employee", selectedId],
    queryFn: () => getEmployeeById(selectedId),
    enabled: !!selectedId,
    staleTime: Infinity,
  });
  console.log(isLoading);
  console.log(employee);
  if (isLoading) {
    return <div className="p-4">Loading employee...</div>;
  }
  return (
    <div className="bg-white p-4">
      <menu>
        <ul className="flex gap-2">
          <li>Edit Profile</li>
          <li>Edit Profile</li>
          <li>Edit Profile</li>
          <li>Edit Profile</li>
        </ul>
      </menu>
      <h1 className="text-2xl font-semibold">
        {employee?.data?.firstName} {employee?.data?.lastName}
      </h1>
      <div className="mt-6 border-1 border-neudival-300 p-6">
        <div>
          <div className="flex gap-4">
            <div>
              <div className="flex gap-4">
                <div className="flex justify-between min-w-28">
                  First Name <span>:</span>
                </div>
                <div>{employee?.data?.firstName}</div>
              </div>
              <div className="flex gap-4">
                <div className="flex justify-between min-w-28">
                  Middle Name <span>:</span>
                </div>
                <div>{employee?.data?.lastName}</div>
              </div>
              <div className="flex gap-4">
                <div className="flex justify-between min-w-28">
                  Last Name <span>:</span>
                </div>
                <div>{employee?.data?.lastName}</div>
              </div>
            </div>
            <div>
              <div className="flex gap-4">
                <div className="flex justify-between min-w-28">
                  Employee Id <span>:</span>
                </div>
                <div>{employee?.data?.employeeId}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex gap-4">
              <div className="flex justify-between min-w-28">
                Email <span>:</span>
              </div>
              <div>{employee?.data?.email}</div>
            </div>
            <div className="flex gap-4">
              <div className="flex justify-between min-w-28">
                Mobile Number <span>:</span>
              </div>
              <div>{employee?.data?.phone}</div>
            </div>
            <div className="flex gap-4">
              <div className="flex justify-between min-w-28">
                Status <span>:</span>
              </div>
              <div>{employee?.data?.status}</div>
            </div>
          </div>
        </div>
        <h1></h1>
        <button>Download Employees List</button>
        <input
          className="w-full border-1 rounded-sm p-2.5 border-neudival-300 focus:outline-none focus:border-neudival-500"
          name="Search Employee"
          placeholder="Username"
        />
      </div>

      <div>
        <h1>Basic Information</h1>
        <ul></ul>
      </div>
    </div>
  );
};

export default EmployeeInformation;
