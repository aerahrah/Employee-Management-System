import AddCtoCreditForm from "./ctoCreditComponents/addCtoCreditForm";
import CtoCreditHistory from "./ctoCreditComponents/recentCtoCreditHistory";
import { CardFull } from "../cardComponent";
const CtoCredits = () => {
  const handleFormSubmit = (data) => {
    console.log("Credit CTO submitted:", data);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CardFull>
        <AddCtoCreditForm onSubmit={handleFormSubmit} />
      </CardFull>
      <CardFull>
        <CtoCreditHistory />
      </CardFull>
    </div>
  );
};

export default CtoCredits;
