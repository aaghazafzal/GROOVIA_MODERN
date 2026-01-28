'use client';

import Link from 'next/link';
import { BiLogoTelegram } from 'react-icons/bi';
import { FaMusic, FaFilm, FaGraduationCap } from 'react-icons/fa';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-zinc-950 border-t border-zinc-800 mt-12">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">

                    {/* About Groovia */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <FaMusic className="text-purple-500 text-2xl" />
                            <h3 className="text-2xl font-bold text-white">Groovia</h3>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Stream unlimited music in high quality. Discover new songs, create playlists, and enjoy your favorite tracks anytime, anywhere.
                        </p>
                    </div>

                    {/* Legal Links */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white">Legal</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href="/dmca"
                                    className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                                >
                                    DMCA
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/privacy"
                                    className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/disclaimer"
                                    className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                                >
                                    Disclaimer
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Other Platforms */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white">Our Platforms</h4>
                        <div className="space-y-3">
                            {/* CinemaHub */}
                            <a
                                href="https://cinemahub.biz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group"
                            >
                                <div className="bg-black border-2 border-red-600 rounded-lg p-3 hover:border-red-500 transition-all hover:shadow-lg hover:shadow-red-600/20">
                                    <div className="flex items-center gap-2">
                                        <FaFilm className="text-red-600 text-xl" />
                                        <div>
                                            <h5 className="text-white font-semibold text-sm group-hover:text-red-500 transition-colors">
                                                CinemaHub
                                            </h5>
                                            <p className="text-gray-500 text-xs">Movies & TV Shows</p>
                                        </div>
                                    </div>
                                </div>
                            </a>

                            {/* Skillora */}
                            <a
                                href="https://skillora-modern.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group"
                            >
                                <div className="bg-black border-2 border-green-600 rounded-lg p-3 hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-600/20">
                                    <div className="flex items-center gap-2">
                                        <FaGraduationCap className="text-green-600 text-xl" />
                                        <div>
                                            <h5 className="text-white font-semibold text-sm group-hover:text-green-500 transition-colors">
                                                Skillora
                                            </h5>
                                            <p className="text-gray-500 text-xs">Online Courses</p>
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Stay Connected */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white">Stay Connected</h4>
                        <div className="space-y-3">
                            {/* Telegram Channel */}
                            <a
                                href="https://t.me/+aAGIRpHjBVdkNGJl"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group"
                            >
                                <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg p-3 hover:from-blue-500 hover:to-blue-400 transition-all hover:shadow-lg hover:shadow-blue-600/30">
                                    <div className="flex items-center gap-2">
                                        <BiLogoTelegram className="text-white text-2xl" />
                                        <div>
                                            <h5 className="text-white font-semibold text-sm">
                                                Telegram Channel
                                            </h5>
                                            <p className="text-blue-100 text-xs">Updates & Domain Changes</p>
                                        </div>
                                    </div>
                                </div>
                            </a>

                            {/* Univora */}
                            <a
                                href="https://univora.site"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 hover:border-purple-600 transition-all">
                                    <p className="text-gray-400 text-xs mb-1">Platform by</p>
                                    <h5 className="text-white font-bold text-base bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                        Univora
                                    </h5>
                                    <p className="text-gray-500 text-xs mt-1">Visit for more information</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-zinc-800 pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-sm text-center md:text-left">
                            © {currentYear} Groovia. All rights reserved.
                            <span className="hidden md:inline"> | </span>
                            <span className="block md:inline mt-1 md:mt-0">
                                A platform by <a href="https://univora.site" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">Univora</a>
                            </span>
                        </p>
                        <p className="text-gray-600 text-xs">
                            Made with 💜 for music lovers
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
