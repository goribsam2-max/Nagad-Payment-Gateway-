import React, { useState } from 'react';

const blogs = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  title: `তথ্যপ্রযুক্তি ও জীবনযাত্রা - পর্ব ${i + 1}`,
  date: `প্রকাশিত হয়েছে: ১০ অক্টোবর, ২০২৩`,
  excerpt: `প্রযুক্তির এই যুগে আমাদের জীবনযাত্রার মান অনেক উন্নত হয়েছে। স্মার্টফোন থেকে শুরু করে ইন্টারনেট, সবকিছুই আমাদের জীবনকে সহজ করে তুলেছে।`,
  content: `প্রযুক্তির এই যুগে আমাদের জীবনযাত্রার মান অনেক উন্নত হয়েছে। স্মার্টফোন থেকে শুরু করে ইন্টারনেট, সবকিছুই আমাদের জীবনকে সহজ করে তুলেছে। বর্তমানে মোবাইল পেমেন্ট থেকে শুরু করে অনলাইন শপিং, সবকিছুই আঙুলের ডগায়। কৃত্রিম বুদ্ধিমত্তা (AI) এবং ইন্টারনেট অফ থিংস (IoT) আমাদের দৈনন্দিন কাজগুলোকে অটোমেট করছে। সকালে অ্যালার্ম বাজানো থেকে শুরু করে কফি বানানো, এমনকি বাসার লাইট ফ্যান কন্ট্রোল করা, সবকিছুই এখন স্মার্ট ডিভাইসের মাধ্যমে সম্ভব।\n\nতবে এই প্রযুক্তির কিছু নেতিবাচক দিকও রয়েছে। অতিরিক্ত স্ক্রিন টাইম আমাদের শারীরিক ও মানসিক স্বাস্থ্যের উপর প্রভাব ফেলছে। সাইবার সিকিউরিটি এখন একটি বড় চিন্তার বিষয়। তাই প্রযুক্তি ব্যবহারের ক্ষেত্রে আমাদের আরও সচেতন হতে হবে। ভবিষ্যতে প্রযুক্তি আরও উন্নত হবে, এবং আমাদের এর সাথে খাপ খাইয়ে নিতে হবে।`
}));

export const BlogFallback = () => {
  const [selectedBlog, setSelectedBlog] = useState<number | null>(null);

  if (selectedBlog !== null) {
    const blog = blogs.find(b => b.id === selectedBlog);
    return (
      <div className="min-h-screen bg-white p-6 font-sans">
        <header className="max-w-3xl mx-auto pb-4 mb-6">
          <button onClick={() => setSelectedBlog(null)} className="text-blue-600 hover:underline mb-4">
            &larr; ফিরে যান
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{blog?.title}</h1>
          <p className="text-gray-500 mt-2">{blog?.date}</p>
        </header>
        <main className="max-w-3xl mx-auto">
          {blog?.content.split('\n\n').map((para, idx) => (
            <p key={idx} className="text-gray-700 leading-relaxed mb-4 text-lg">
              {para}
            </p>
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="max-w-4xl mx-auto border-b pb-6 mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">বাংলা টেক ও লাইফস্টাইল ব্লগ</h1>
        <p className="text-gray-500 mt-3 text-lg">প্রযুক্তি বিষয়ক সর্বশেষ প্রবন্ধ ও মতামত</p>
      </header>
      
      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {blogs.map((blog) => (
          <article key={blog.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{blog.title}</h2>
            <p className="text-xs text-gray-400 mb-4">{blog.date}</p>
            <p className="text-gray-600 leading-relaxed mb-4">
              {blog.excerpt}
            </p>
            <button onClick={() => setSelectedBlog(blog.id)} className="text-blue-600 font-bold hover:underline">
              সম্পূর্ণ পড়ুন &rarr;
            </button>
          </article>
        ))}
      </main>
    </div>
  );
};
