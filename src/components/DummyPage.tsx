export default function DummyPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
      <div className="w-16 h-16 bg-indigo-50 text-[#4338CA] rounded-full flex items-center justify-center text-2xl font-bold">
         {title.charAt(0)}
      </div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="text-gray-500 max-w-md">The {title} module is currently under development. Check back later for updates.</p>
    </div>
  );
}