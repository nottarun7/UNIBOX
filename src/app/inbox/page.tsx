import ClientInbox from "./ClientInbox";

export default function InboxPage() {
  // Server component: render the client component that performs data fetching with hooks
  return (
    <div className="min-h-screen p-6">
      <ClientInbox />
    </div>
  );
}
