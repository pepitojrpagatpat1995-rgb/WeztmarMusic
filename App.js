import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const GOLD = '#E8AA3D';
const BG = '#050607';
const CARD = '#0D1116';
const MUTED = '#9299A3';
const STORAGE_KEY = '@weztmar_music_library_v1';

const demoTracks = [
  {
    id: 'demo-1',
    title: 'Aking Mundo',
    artist: 'Weztmar',
    album: 'The Journey',
    genre: 'OPM',
    duration: '4:36',
    uri: null,
    cover: null,
    favorite: false,
  },
  {
    id: 'demo-2',
    title: 'Sweet Poison',
    artist: 'Weztmar',
    album: 'Midnight',
    genre: 'Rock',
    duration: '3:48',
    uri: null,
    cover: null,
    favorite: false,
  },
  {
    id: 'demo-3',
    title: 'Huling Sayaw',
    artist: 'Weztmar',
    album: 'Memories',
    genre: 'Ballad',
    duration: '5:12',
    uri: null,
    cover: null,
    favorite: false,
  },
];

export default function App() {
  const [tab, setTab] = useState('Home');
  const [tracks, setTracks] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [query, setQuery] = useState('');
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('OPM');
  const [audioAsset, setAudioAsset] = useState(null);
  const [coverUri, setCoverUri] = useState(null);
  const [lyrics, setLyrics] = useState('');
  const soundRef = useRef(null);

  useEffect(() => {
    loadLibrary();
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  async function loadLibrary() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setTracks(raw ? JSON.parse(raw) : demoTracks);
    } catch {
      setTracks(demoTracks);
    }
  }

  async function saveLibrary(next) {
    setTracks(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled) setAudioAsset(result.assets[0]);
  }

  async function pickCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to choose an album cover.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  }

  async function publishTrack() {
    if (!audioAsset?.uri) {
      Alert.alert('Choose audio', 'Please select an MP3 or other audio file first.');
      return;
    }
    if (!title.trim() || !artist.trim()) {
      Alert.alert('Missing details', 'Please enter the song title and artist.');
      return;
    }

    const newTrack = {
      id: `track-${Date.now()}`,
      title: title.trim(),
      artist: artist.trim(),
      album: album.trim() || 'Single',
      genre: genre.trim() || 'Music',
      duration: '',
      uri: audioAsset.uri,
      cover: coverUri,
      lyrics: lyrics.trim(),
      favorite: false,
    };

    await saveLibrary([newTrack, ...tracks]);
    setTitle('');
    setArtist('');
    setAlbum('');
    setGenre('OPM');
    setLyrics('');
    setAudioAsset(null);
    setCoverUri(null);
    setUploadOpen(false);
    setTab('Library');
    Alert.alert('Published', 'Your song has been added to Weztmar Music.');
  }

  async function playTrack(track) {
    if (!track.uri) {
      Alert.alert('Demo track', 'This sample has no local audio file. Upload your own song to play it.');
      return;
    }
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatus,
      );
      soundRef.current = sound;
      setCurrent(track);
      setPlaying(true);
      setNowPlayingOpen(true);
    } catch (e) {
      Alert.alert('Playback error', 'The selected audio file could not be played.');
    }
  }

  function onPlaybackStatus(status) {
    if (!status.isLoaded) return;
    setPosition(status.positionMillis || 0);
    setDurationMs(status.durationMillis || 0);
    setPlaying(Boolean(status.isPlaying));
    if (status.didJustFinish) setPlaying(false);
  }

  async function togglePlay() {
    if (!soundRef.current) return;
    if (playing) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  }

  async function stopPlayback() {
    if (soundRef.current) await soundRef.current.unloadAsync();
    soundRef.current = null;
    setPlaying(false);
    setCurrent(null);
    setPosition(0);
    setDurationMs(0);
    setNowPlayingOpen(false);
  }

  async function seek(delta) {
    if (!soundRef.current || !durationMs) return;
    const next = Math.max(0, Math.min(durationMs, position + delta));
    await soundRef.current.setPositionAsync(next);
  }

  async function toggleFavorite(track) {
    const next = tracks.map(t =>
      t.id === track.id ? { ...t, favorite: !t.favorite } : t
    );
    await saveLibrary(next);
    if (current?.id === track.id) setCurrent({ ...current, favorite: !current.favorite });
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return tracks;
    return tracks.filter(t =>
      `${t.title} ${t.artist} ${t.album} ${t.genre}`.toLowerCase().includes(q)
    );
  }, [tracks, query]);

  const formatTime = ms => {
    const total = Math.floor((ms || 0) / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };

  function Cover({ track, size = 72 }) {
    return track?.cover ? (
      <Image source={{ uri: track.cover }} style={{ width: size, height: size, borderRadius: 14 }} />
    ) : (
      <LinearGradient
        colors={['#26170A', '#0B1822']}
        style={[styles.coverFallback, { width: size, height: size, borderRadius: 14 }]}
      >
        <Text style={{ fontSize: size * 0.36 }}>♫</Text>
      </LinearGradient>
    );
  }

  function Header({ title: headerTitle = 'WEZTMAR MUSIC' }) {
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>WEZTMAR</Text>
          <Text style={styles.brandSub}>MUSIC</Text>
        </View>
        <View style={styles.headerIcons}>
          <Text style={styles.icon}>♧</Text>
          <View style={styles.avatar}><Text>W</Text></View>
        </View>
      </View>
    );
  }

  function Home() {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="#6F7781"
          style={styles.search}
        />
        <LinearGradient colors={['#24180D', '#0B1117']} style={styles.hero}>
          <Text style={styles.kicker}>YOUR MUSIC. YOUR STORY.</Text>
          <Text style={styles.heroTitle}>Welcome to{'\n'}Weztmar Music</Text>
          <Text style={styles.heroSub}>Stream  •  Upload  •  Enjoy</Text>
        </LinearGradient>

        <SectionTitle title="Recently Played" action="See All" />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tracks.slice(0, 6)}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => playTrack(item)} style={{ width: 148 }}>
              <Cover track={item} size={148} />
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.muted}>{item.artist}</Text>
            </Pressable>
          )}
        />

        <SectionTitle title="Your Music" />
        <View style={styles.grid}>
          <QuickCard icon="♫" title="All Songs" value={`${tracks.length} songs`} onPress={() => setTab('Library')} />
          <QuickCard icon="◉" title="Albums" value={`${new Set(tracks.map(t => t.album)).size} albums`} onPress={() => setTab('Library')} />
          <QuickCard icon="♟" title="Artists" value={`${new Set(tracks.map(t => t.artist)).size} artists`} onPress={() => setTab('Library')} />
          <QuickCard icon="☷" title="Playlists" value="4 playlists" onPress={() => setTab('Library')} />
        </View>

        <SectionTitle title="Made For You" action="See All" />
        <View style={styles.playlistRow}>
          {['Chill Vibes', 'Late Night', 'OPM Essentials'].map((name, i) => (
            <View key={name} style={styles.playlistCard}>
              <LinearGradient colors={i === 1 ? ['#07152A', '#0A0D10'] : ['#38200A', '#0A0D10']} style={styles.playlistArt}>
                <Text style={{ fontSize: 38 }}>♫</Text>
              </LinearGradient>
              <Text style={styles.cardTitle}>{name}</Text>
              <Text style={styles.muted}>Playlist · Weztmar</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  function Library() {
    const favorites = tracks.filter(t => t.favorite);
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header />
        <Text style={styles.pageTitle}>Library</Text>
        <View style={styles.tabs}>
          {['Songs', 'Albums', 'Artists', 'Playlists'].map(x => (
            <Text key={x} style={[styles.tabText, x === 'Songs' && styles.tabActive]}>{x}</Text>
          ))}
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search in your library..."
          placeholderTextColor="#6F7781"
          style={styles.search}
        />
        <SectionTitle title="Recently Added" action={`${favorites.length} favorites`} />
        {filtered.map(item => <TrackRow key={item.id} item={item} />)}
      </ScrollView>
    );
  }

  function TrackRow({ item }) {
    return (
      <Pressable style={styles.trackRow} onPress={() => playTrack(item)}>
        <Cover track={item} size={58} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trackTitle}>{item.title}</Text>
          <Text style={styles.muted}>{item.artist} · {item.album}</Text>
        </View>
        <Pressable onPress={() => toggleFavorite(item)} hitSlop={12}>
          <Text style={{ color: item.favorite ? GOLD : '#66707C', fontSize: 22 }}>{item.favorite ? '♥' : '♡'}</Text>
        </Pressable>
      </Pressable>
    );
  }

  function Search() {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header />
        <Text style={styles.pageTitle}>Search</Text>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Songs, artists, albums..."
          placeholderTextColor="#6F7781"
          style={styles.search}
        />
        {query ? (
          filtered.map(item => <TrackRow key={item.id} item={item} />)
        ) : (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 44 }}>⌕</Text>
            <Text style={styles.emptyTitle}>Find your music</Text>
            <Text style={styles.muted}>Search your personal Weztmar Music library.</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  function Profile() {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header />
        <View style={styles.profileHero}>
          <View style={styles.bigAvatar}><Text style={{ fontSize: 42 }}>W</Text></View>
          <Text style={styles.pageTitle}>Weztmar</Text>
          <Text style={styles.muted}>Your music. Your story.</Text>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingTitle}>App settings</Text>
          <Setting label="Autoplay" />
          <Setting label="Dark mode" on />
          <Setting label="High quality audio" on />
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingTitle}>Storage</Text>
          <Text style={styles.muted}>{tracks.length} songs saved in your library</Text>
        </View>
      </ScrollView>
    );
  }

  function Setting({ label, on = false }) {
    return (
      <View style={styles.settingRow}>
        <Text style={styles.trackTitle}>{label}</Text>
        <Switch value={on} trackColor={{ false: '#2A3038', true: '#8B641F' }} thumbColor={on ? GOLD : '#9AA1A9'} />
      </View>
    );
  }

  function SectionTitle({ title: sectionTitle, action }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        {action ? <Text style={styles.action}>{action}</Text> : null}
      </View>
    );
  }

  function QuickCard({ icon, title: cardTitle, value, onPress }) {
    return (
      <Pressable onPress={onPress} style={styles.quickCard}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
        <Text style={styles.cardTitle}>{cardTitle}</Text>
        <Text style={styles.muted}>{value}</Text>
      </Pressable>
    );
  }

  function UploadModal() {
    return (
      <Modal visible={uploadOpen} animationType="slide" onRequestClose={() => setUploadOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.modalHeader}>
              <Text style={styles.pageTitle}>Upload Music</Text>
              <Pressable onPress={() => setUploadOpen(false)}><Text style={styles.close}>×</Text></Pressable>
            </View>

            <Pressable onPress={pickCover} style={styles.coverPicker}>
              {coverUri ? <Image source={{ uri: coverUri }} style={styles.pickerImage} /> : <Text style={{ fontSize: 48 }}>＋</Text>}
              <Text style={styles.trackTitle}>{coverUri ? 'Change Cover' : 'Choose Cover'}</Text>
              <Text style={styles.muted}>JPG or PNG · 1:1</Text>
            </Pressable>

            <Text style={styles.label}>Song Title *</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Aking Mundo" placeholderTextColor="#68717B" style={styles.input} />

            <Text style={styles.label}>Artist *</Text>
            <TextInput value={artist} onChangeText={setArtist} placeholder="Artist name" placeholderTextColor="#68717B" style={styles.input} />

            <Text style={styles.label}>Album</Text>
            <TextInput value={album} onChangeText={setAlbum} placeholder="Single / album name" placeholderTextColor="#68717B" style={styles.input} />

            <Text style={styles.label}>Genre</Text>
            <TextInput value={genre} onChangeText={setGenre} placeholder="OPM, Rock, Ballad..." placeholderTextColor="#68717B" style={styles.input} />

            <Text style={styles.label}>Lyrics (optional)</Text>
            <TextInput
              value={lyrics}
              onChangeText={setLyrics}
              placeholder="Paste your own lyrics here..."
              placeholderTextColor="#68717B"
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
              multiline
            />

            <Pressable onPress={pickAudio} style={styles.audioPicker}>
              <Text style={{ fontSize: 30 }}>♫</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackTitle}>{audioAsset ? audioAsset.name : 'Choose Audio File'}</Text>
                <Text style={styles.muted}>{audioAsset ? 'Ready to publish' : 'MP3, M4A, WAV and supported audio files'}</Text>
              </View>
            </Pressable>

            <Pressable onPress={publishTrack} style={styles.goldButton}>
              <Text style={styles.goldButtonText}>PUBLISH SONG</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  function NowPlaying() {
    if (!current) return null;
    const progress = durationMs ? position / durationMs : 0;
    return (
      <Modal visible={nowPlayingOpen} animationType="slide" onRequestClose={() => setNowPlayingOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <ScrollView contentContainerStyle={styles.nowPlaying}>
            <View style={styles.npTop}>
              <Pressable onPress={() => setNowPlayingOpen(false)}><Text style={styles.close}>⌄</Text></Pressable>
              <Text style={styles.brand}>WEZTMAR MUSIC</Text>
              <Pressable onPress={stopPlayback}><Text style={styles.close}>⋮</Text></Pressable>
            </View>

            <Cover track={current} size={330} />
            <View style={styles.npMeta}>
              <View style={{ flex: 1 }}>
                <Text style={styles.npTitle}>{current.title}</Text>
                <Text style={styles.npArtist}>{current.artist}</Text>
              </View>
              <Pressable onPress={() => toggleFavorite(current)}>
                <Text style={{ color: current.favorite ? GOLD : '#FFF', fontSize: 32 }}>{current.favorite ? '♥' : '♡'}</Text>
              </Pressable>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(2, progress * 100)}%` }]} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.muted}>{formatTime(position)}</Text>
              <Text style={styles.muted}>{formatTime(durationMs)}</Text>
            </View>

            <View style={styles.controls}>
              <Pressable onPress={() => seek(-10000)}><Text style={styles.control}>↶</Text></Pressable>
              <Pressable onPress={() => seek(-15000)}><Text style={styles.control}>◀</Text></Pressable>
              <Pressable onPress={togglePlay} style={styles.playButton}>
                <Text style={{ color: '#050607', fontSize: 30 }}>{playing ? 'Ⅱ' : '▶'}</Text>
              </Pressable>
              <Pressable onPress={() => seek(15000)}><Text style={styles.control}>▶</Text></Pressable>
              <Pressable onPress={() => seek(10000)}><Text style={styles.control}>↷</Text></Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.pill}><Text>♫  Lyrics</Text></Pressable>
              <Pressable style={styles.pill}><Text>＋ Playlist</Text></Pressable>
              <Pressable style={styles.pill}><Text>↓ Download</Text></Pressable>
            </View>

            {current.lyrics ? (
              <View style={styles.lyricsBox}>
                <Text style={styles.sectionTitle}>Lyrics</Text>
                <Text style={styles.lyrics}>{current.lyrics}</Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  function Nav() {
    const items = [
      ['Home', '⌂'],
      ['Search', '⌕'],
      ['Upload', '↑'],
      ['Library', '▤'],
      ['Profile', '♙'],
    ];
    return (
      <View style={styles.nav}>
        {items.map(([name, icon]) => (
          <Pressable
            key={name}
            onPress={() => name === 'Upload' ? setUploadOpen(true) : setTab(name)}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, (tab === name || (name === 'Upload' && uploadOpen)) && styles.navActive]}>{icon}</Text>
            <Text style={[styles.navText, (tab === name || (name === 'Upload' && uploadOpen)) && styles.navActive]}>{name}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      {tab === 'Home' && <Home />}
      {tab === 'Search' && <Search />}
      {tab === 'Library' && <Library />}
      {tab === 'Profile' && <Profile />}

      {current && !nowPlayingOpen && (
        <Pressable style={styles.miniPlayer} onPress={() => setNowPlayingOpen(true)}>
          <Cover track={current} size={50} />
          <View style={{ flex: 1 }}>
            <Text style={styles.trackTitle} numberOfLines={1}>{current.title}</Text>
            <Text style={styles.muted}>{current.artist}</Text>
          </View>
          <Pressable onPress={togglePlay} hitSlop={10}>
            <Text style={styles.miniPlay}>{playing ? 'Ⅱ' : '▶'}</Text>
          </Pressable>
        </Pressable>
      )}

      <Nav />
      <UploadModal />
      <NowPlaying />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: BG },
  scroll: { padding: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brand: { color: GOLD, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  brandSub: { color: '#E5E7EB', fontSize: 11, letterSpacing: 6, marginTop: -2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  icon: { color: '#FFF', fontSize: 26 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF' },
  search: { backgroundColor: '#12171D', borderRadius: 24, borderWidth: 1, borderColor: '#222A32', paddingHorizontal: 18, height: 52, color: '#FFF', fontSize: 15, marginBottom: 18 },
  hero: { borderRadius: 22, padding: 24, minHeight: 190, justifyContent: 'center', borderWidth: 1, borderColor: '#40321F', marginBottom: 24 },
  kicker: { color: GOLD, fontSize: 11, letterSpacing: 2.4, marginBottom: 12 },
  heroTitle: { color: '#FFF', fontSize: 30, fontWeight: '800', lineHeight: 35 },
  heroSub: { color: '#BFC4CA', fontSize: 15, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 },
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  action: { color: GOLD, fontSize: 13 },
  coverFallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#303944' },
  cardTitle: { color: '#FFF', fontWeight: '700', fontSize: 15, marginTop: 8 },
  muted: { color: MUTED, fontSize: 12, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  quickCard: { width: '48%', backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#1E252D', minHeight: 118 },
  playlistRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  playlistCard: { width: 155 },
  playlistArt: { height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2B323A' },
  pageTitle: { color: '#FFF', fontSize: 30, fontWeight: '800', marginBottom: 18 },
  tabs: { flexDirection: 'row', backgroundColor: '#0D1116', borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
  tabText: { flex: 1, textAlign: 'center', paddingVertical: 12, color: '#A3A9B1', fontSize: 12 },
  tabActive: { color: '#050607', backgroundColor: GOLD, borderRadius: 20, fontWeight: '800' },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#12171D' },
  trackTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 90 },
  emptyTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 12 },
  profileHero: { alignItems: 'center', paddingVertical: 24 },
  bigAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12171D', marginBottom: 18 },
  settingCard: { backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: '#1E252D', padding: 16, marginBottom: 14 },
  settingTitle: { color: '#FFF', fontWeight: '800', fontSize: 18, marginBottom: 10 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9 },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, backgroundColor: '#090C10', borderTopWidth: 1, borderTopColor: '#20262D', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 8 },
  navItem: { alignItems: 'center', minWidth: 62 },
  navIcon: { color: '#737B86', fontSize: 22, marginBottom: 2 },
  navText: { color: '#737B86', fontSize: 10 },
  navActive: { color: GOLD, fontWeight: '800' },
  miniPlayer: { position: 'absolute', left: 10, right: 10, bottom: 82, backgroundColor: '#10151B', borderRadius: 16, borderWidth: 1, borderColor: '#2C333C', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniPlay: { color: GOLD, fontSize: 22, paddingHorizontal: 10 },
  modal: { flex: 1, backgroundColor: BG },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  close: { color: '#FFF', fontSize: 32 },
  coverPicker: { backgroundColor: CARD, borderRadius: 22, padding: 22, alignItems: 'center', borderWidth: 1, borderColor: '#242C34', marginBottom: 18 },
  pickerImage: { width: 210, height: 210, borderRadius: 18, marginBottom: 12 },
  label: { color: '#C6CBD1', fontSize: 13, marginTop: 12, marginBottom: 7 },
  input: { backgroundColor: '#0D1116', borderRadius: 14, borderWidth: 1, borderColor: '#262F38', color: '#FFF', paddingHorizontal: 15, height: 52 },
  audioPicker: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#11171D', borderRadius: 16, borderWidth: 1, borderColor: GOLD, padding: 16, marginTop: 20 },
  goldButton: { backgroundColor: GOLD, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 18 },
  goldButtonText: { color: '#08090A', fontWeight: '900', letterSpacing: 1.2 },
  nowPlaying: { alignItems: 'center', padding: 18, paddingBottom: 60 },
  npTop: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  npMeta: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  npTitle: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  npArtist: { color: MUTED, fontSize: 17, marginTop: 5 },
  progressTrack: { width: '100%', height: 5, backgroundColor: '#242B33', borderRadius: 3, marginTop: 24, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: GOLD, borderRadius: 3 },
  timeRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  controls: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  control: { color: '#FFF', fontSize: 26 },
  playButton: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, borderColor: GOLD, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  actionRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 24 },
  pill: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: '#2A333C', paddingVertical: 12, alignItems: 'center' },
  pillText: { color: '#FFF', fontSize: 12 },
  lyricsBox: { width: '100%', marginTop: 22, backgroundColor: CARD, borderRadius: 18, padding: 18 },
  lyrics: { color: '#C8CDD3', lineHeight: 23, marginTop: 10 },
});