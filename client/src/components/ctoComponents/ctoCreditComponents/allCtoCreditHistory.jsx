import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllCreditRequests, cancelCreditRequest } from "../../../api/cto";

const AllCtoCreditHistory = () => {
  const queryClient = useQueryClient();

  const {
    data: credits = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["allCredits"],
    queryFn: fetchAllCreditRequests,
  });
  console.log(credits);

  const { mutate: cancelRequest } = useMutation({
    mutationFn: cancelCreditRequest,
    onSuccess: () => {
      queryClient.invalidateQueries(["allCredits"]);
      queryClient.invalidateQueries(["recentCredits"]); // optional
    },
  });

  const handleCancel = (id) => {
    cancelRequest(id);
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-md shadow-lg">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white p-6 rounded-md shadow-lg">
        <p className="text-red-500">Error fetching credit requests</p>
      </div>
    );
  }

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-PH") : "-";

  return (
    <div className="bg-white h-128  overflow-y-auto">
      <div className="overflow-x-auto">
        <table className="w-full text-sm rounded-lg shadow-sm">
          <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-left sticky top-0 z-10">
            <tr>
              <th className="p-3 border-b border-r border-gray-200">
                Employees
              </th>
              <th className="p-3 text-center border-b border-r border-gray-200">
                Hours
              </th>
              <th className="p-3 border-b border-r border-gray-200">
                Memo No.
              </th>
              <th className="p-3 border-b border-r border-gray-200">
                Approver
              </th>
              <th className="p-3 text-center border-b border-r border-gray-200">
                Status
              </th>
              <th className="p-3 text-center border-b border-r border-gray-200">
                Date Applied
              </th>
              <th className="p-3 text-center border-b border-r border-gray-200">
                Date Approved
              </th>
              <th className="p-3 text-center border-b border-r border-gray-200">
                Canceled At
              </th>
              <th className="p-3 text-center border-b border-r border-gray-200">
                Canceled By
              </th>
              <th className="p-3 border-b border-r border-gray-200">Remarks</th>
              <th className="p-3 text-center border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {credits.length > 0 ? (
              credits.map((credit, index) => (
                <tr
                  key={credit._id}
                  className={`transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-gray-100`}
                >
                  <td className="p-3 font-medium text-gray-800 border-b border-gray-200 border-r">
                    {credit.employees
                      .map((e) => `${e.firstName} ${e.lastName}`)
                      .join(", ")}
                  </td>
                  <td className="p-3 text-center border-b border-gray-200 border-r">
                    {credit.hours}
                  </td>
                  <td className="p-3 border-b border-gray-200 border-r">
                    {credit.memoNo}
                  </td>
                  <td className="p-3 border-b border-gray-200 border-r">
                    {credit.approver?.firstName} {credit.approver?.lastName}
                  </td>
                  <td
                    className={`p-3 font-semibold text-center border-b border-gray-200 border-r ${
                      credit.status === "PENDING"
                        ? "text-yellow-600"
                        : credit.status === "APPROVED"
                        ? "text-green-600"
                        : credit.status === "REJECTED"
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {credit.status}
                  </td>
                  <td className="p-3 text-center border-b border-gray-200 border-r">
                    {formatDate(credit.createdAt)}
                  </td>
                  <td className="p-3 text-center border-b border-gray-200 border-r">
                    {formatDate(credit.dateApproved)}
                  </td>
                  <td className="p-3 text-center border-b border-gray-200 border-r">
                    {formatDate(credit.canceledAt)}
                  </td>
                  <td className="p-3 border-b border-gray-200 border-r">
                    {credit.canceledBy
                      ? `${credit.canceledBy.firstName} ${credit.canceledBy.lastName}`
                      : "-"}
                  </td>
                  <td className="p-3 border-b border-gray-200 border-r">
                    {credit.remarks || "-"}
                  </td>
                  <td className="p-3 text-center border-b border-gray-200">
                    <button
                      onClick={() => handleCancel(credit._id)}
                      disabled={credit.status !== "PENDING"}
                      className={`px-3 py-1 text-sm rounded transition ${
                        credit.status === "PENDING"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="p-3 text-center text-gray-500">
                  No credit requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllCtoCreditHistory;
