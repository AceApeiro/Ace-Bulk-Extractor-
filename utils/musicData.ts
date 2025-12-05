
export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: string;
}

const ARTISTS = [
  "Nirvana", "Pearl Jam", "Soundgarden", "Alice in Chains", "Radiohead", 
  "Red Hot Chili Peppers", "The Smashing Pumpkins", "Green Day", "Weezer", "Foo Fighters",
  "R.E.M.", "The Cure", "Depeche Mode", "The Smiths", "Pixies",
  "Sonic Youth", "Nine Inch Nails", "Stone Temple Pilots", "Bush", "Live",
  "Oasis", "Blur", "Pulp", "The Verve", "Jane's Addiction",
  "The White Stripes", "The Strokes", "Arctic Monkeys", "Muse", "Linkin Park"
];

const TITLES = [
  "Smells Like Teen Spirit", "Alive", "Black Hole Sun", "Man in the Box", "Creep",
  "Under the Bridge", "1979", "Basket Case", "Buddy Holly", "Everlong",
  "Losing My Religion", "Just Like Heaven", "Enjoy the Silence", "There Is a Light That Never Goes Out", "Where Is My Mind?",
  "Teen Age Riot", "Closer", "Interstate Love Song", "Glycerine", "Lightning Crashes",
  "Wonderwall", "Song 2", "Common People", "Bitter Sweet Symphony", "Jane Says",
  "Seven Nation Army", "Last Nite", "I Bet You Look Good on the Dancefloor", "Plug In Baby", "In the End"
];

// High-Energy Rock & Alternative Tracks (Royalty Free / Creative Commons)
// Replacing ambient placeholders with actual Rock/Grunge/Punk vibes.
const DEMO_TRACKS = [
  // Hard Rock / Grunge Vibe
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/Hyper_Metal_-_Hard_Rock/Loyalty_Freak_Music_-_03_-_I_m_a_monster.mp3",
  
  // Upbeat Rock / Punk Energy
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/Hyper_Metal_-_Hard_Rock/Loyalty_Freak_Music_-_04_-_Cant_Stop_My_Feet.mp3",
  
  // Surf Rock / Pixies Vibe
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/Hyper_Metal_-_Hard_Rock/Loyalty_Freak_Music_-_08_-_Ghost_Surf_Rock.mp3",
  
  // Driving Alternative
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Music_for_Video/Loyalty_Freak_Music/Hyper_Metal_-_Hard_Rock/Loyalty_Freak_Music_-_02_-_Go_.mp3",
  
  // Melodic Rock / R.E.M. Vibe
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Jahzzar/Tumbling_Dishes_Like_Old-Mans_Wishes/Jahzzar_-_05_-_Siesta.mp3",
  
  // Garage Rock / White Stripes Vibe
  "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/WFMU/The_Moaners/Live_on_WFMU_on_The_Evan_Funk_Davies_Show_Sept_20_2005/The_Moaners_-_02_-_Tired_Of_My_Time.mp3"
];

export const generatePlaylist = (): Song[] => {
  const playlist: Song[] = [];
  let count = 0;

  // 1. Generate base list
  for (let i = 0; i < ARTISTS.length; i++) {
     playlist.push({
        id: `trk-${count++}`,
        artist: ARTISTS[i],
        title: TITLES[i] || "Greatest Hit",
        url: DEMO_TRACKS[i % DEMO_TRACKS.length],
        duration: "3:45"
     });
  }

  // 2. Generate variations to reach 300
  const variations = ["(Live at CBGB)", "(Acoustic)", "(2024 Remaster)", "(Demo)", "(Unplugged)", "(Extended Mix)", "(Radio Edit)", "(Instrumental)", "(Live in Seattle)"];
  
  while (playlist.length < 300) {
      const artistIdx = Math.floor(Math.random() * ARTISTS.length);
      const titleIdx = Math.floor(Math.random() * TITLES.length);
      const varIdx = Math.floor(Math.random() * variations.length);
      const urlIdx = Math.floor(Math.random() * DEMO_TRACKS.length);
      
      playlist.push({
          id: `trk-${count++}`,
          artist: ARTISTS[artistIdx],
          title: `${TITLES[titleIdx] || "Untitled Track"} ${variations[varIdx]}`,
          url: DEMO_TRACKS[urlIdx],
          duration: `${Math.floor(Math.random() * 3) + 2}:${Math.floor(Math.random() * 50) + 10}`
      });
  }

  return playlist;
};
