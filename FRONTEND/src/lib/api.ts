import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jiosavan-sigma.vercel.app/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const searchSongs = async (query: string, page = 0, limit = 10) => {
  const response = await api.get(`/search/songs`, {
    params: { query, page, limit }
  });
  return response.data;
};

export const searchGlobal = async (query: string) => {
  const response = await api.get(`/search`, {
    params: { query }
  });
  return response.data;
};

export const getSongById = async (id: string) => {
  const response = await api.get(`/songs/${id}`);
  return response.data;
};

export const getSongSuggestions = async (id: string, limit = 10) => {
  const response = await api.get(`/songs/${id}/suggestions`, {
    params: { limit }
  });
  return response.data;
};

export const fetchPlaylistById = async (id: string, limit = 50) => {
  const response = await api.get(`/playlists`, {
    params: { id, limit }
  });
  return response.data;
};

export const searchAlbums = async (query: string, page = 0, limit = 10) => {
  const response = await api.get(`/search/albums`, {
    params: { query, page, limit }
  });
  return response.data;
};

export const searchArtists = async (query: string, page = 0, limit = 10) => {
  const response = await api.get(`/search/artists`, {
    params: { query, page, limit }
  });
  return response.data;
};

export const searchPlaylists = async (query: string, page = 0, limit = 10) => {
  const response = await api.get(`/search/playlists`, {
    params: { query, page, limit }
  });
  return response.data;
};
