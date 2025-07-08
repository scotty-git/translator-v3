export function BasicTest() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Basic Test</h1>
      <p>If you can see this, React is working.</p>
      <button 
        onClick={() => console.log('Button works!')}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Button
      </button>
    </div>
  )
}