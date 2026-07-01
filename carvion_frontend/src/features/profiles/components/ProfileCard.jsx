import React from 'react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';

export default function ProfileCard({ profile }) {
  if (!profile) return null;

  return (
    <Card hoverable={false} className="flex flex-col items-center text-center bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] shadow-sm p-6">
      {/* User Avatar Circle */}
      <div className="w-24 h-24 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-3xl shadow-md border-4 border-slate-50">
        {profile.name ? profile.name[0].toUpperCase() : 'U'}
      </div>

      <h3 className="text-xl font-extrabold text-slate-850 mt-4">{profile.name}</h3>
      <p className="text-sm text-slate-400 font-semibold mt-1 flex items-center justify-center space-x-1.5">
        <FiMail className="w-4 h-4 text-slate-400" />
        <span>{profile.email}</span>
      </p>

      {/* Subscription Role Badge */}
      <div className="mt-3">
        <Badge variant={profile.role === 'admin' ? 'success' : 'brand'}>
          {profile.role === 'admin' ? 'ADMIN OPERATOR' : 'STANDARD USER'}
        </Badge>
      </div>

      {/* Bio Description */}
      <p className="text-sm text-slate-500 mt-4 px-2 leading-relaxed font-medium">
        {profile.bio || "No professional summary details specified. Fill out your details in settings to inject context into your career guides."}
      </p>

      {/* Social Links Grid */}
      <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-slate-100 w-full justify-center">
        {profile.github_url ? (
          <a
            href={profile.github_url.startsWith('http') ? profile.github_url : `https://${profile.github_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-orange-500 transition-colors"
          >
            <FiGithub className="w-5 h-5" />
          </a>
        ) : (
          <FiGithub className="w-5 h-5 text-slate-300 cursor-not-allowed" />
        )}

        {profile.linkedin_url ? (
          <a
            href={profile.linkedin_url.startsWith('http') ? profile.linkedin_url : `https://${profile.linkedin_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-orange-500 transition-colors"
          >
            <FiLinkedin className="w-5 h-5" />
          </a>
        ) : (
          <FiLinkedin className="w-5 h-5 text-slate-300 cursor-not-allowed" />
        )}
      </div>
    </Card>
  );
}
