import DivisionClientPage from "./DivisionClientPage";

export function generateStaticParams() {
  return [
    { division: "DATA IM" },
    { division: "UP" },
    { division: "POLE" },
    { division: "MSC ADM" },
    { division: "IQ" },
    { division: "UP FILLING SPV" },
    { division: "UP FILLING MANAGER" },
    { division: "PACKAGING & POLE" },
    { division: "HEAD LAB" },
  ];
}

export default function Page() {
  return <DivisionClientPage />;
}
