import AddCtoCreditForm from "./ctoCreditComponents/addCtoCreditForm";
import CtoCreditHistory from "./ctoCreditComponents/recentCtoCreditHistory";

const CtoCredits = () => {
  const handleFormSubmit = (data) => {
    console.log("Credit CTO submitted:", data);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-6 rounded-md shadow-lg">
        <h2 className="text-xl font-semibold mb-6 border-b pb-2">
          ➕ Credit CTO
        </h2>
        <AddCtoCreditForm onSubmit={handleFormSubmit} />
      </div>
      <CtoCreditHistory />
    </div>
  );
};

export default CtoCredits;
