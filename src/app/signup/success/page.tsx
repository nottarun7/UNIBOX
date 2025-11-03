export default function SignupSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-semibold mb-4">Account created</h1>
        <p className="mb-4">Your account was created successfully. You should be signed in and redirected to the inbox.</p>
        <p className="text-sm text-gray-600">If you are not redirected, you can <a href="/signin" className="text-blue-600">sign in here</a>.</p>
      </div>
    </div>
  );
}
