'use client'

import { Sparkles, Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="heading-3 gradient-text font-bold">Idea to Content</h3>
                <p className="caption text-gray-500">AI Blog Generator</p>
              </div>
            </div>
            <p className="body-text text-gray-600 mb-4">
              Transform your ideas into compelling blog content with AI-powered generation. 
              Create engaging articles in minutes, not hours.
            </p>
            <div className="flex space-x-3">
              <a 
                href="#" 
                className="p-2 text-gray-600 hover:text-black hover:bg-white rounded-lg transition-all duration-200 shadow-uber-light"
              >
                <Github className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="p-2 text-gray-600 hover:text-black hover:bg-white rounded-lg transition-all duration-200 shadow-uber-light"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="p-2 text-gray-600 hover:text-black hover:bg-white rounded-lg transition-all duration-200 shadow-uber-light"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="p-2 text-gray-600 hover:text-black hover:bg-white rounded-lg transition-all duration-200 shadow-uber-light"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="heading-3 text-black mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Blog Generator
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="heading-3 text-black mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="heading-3 text-black mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="body-text text-gray-600 hover:text-black transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="caption text-gray-500">
                © {currentYear} Idea to Content. Made with
              </span>
              <Heart className="w-3 h-3 text-red-500 fill-current" />
              <span className="caption text-gray-500">
                for content creators
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="#" className="caption text-gray-500 hover:text-black transition-colors">
                Privacy
              </Link>
              <Link href="#" className="caption text-gray-500 hover:text-black transition-colors">
                Terms
              </Link>
              <Link href="#" className="caption text-gray-500 hover:text-black transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 