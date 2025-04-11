// components/VideoList.tsx
const VideoList = ({ videos }: { videos: any[] }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {videos.map((video) => (
          <div key={video.id.videoId} className="shadow rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="200"
              src={`https://www.youtube.com/embed/${video.id.videoId}`}
              title={video.snippet.title}
              allowFullScreen
            />
            <p className="p-2 text-sm font-medium">{video.snippet.title}</p>
          </div>
        ))}
      </div>
    );
  };
  