import { currentUser } from "../utils/mockData";
import { Mail, Phone, Globe, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function VisualCard() {
  return (
    <div className="w-full max-w-md bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          {currentUser.photo ? (
            <img
              src={currentUser.photo}
              alt={currentUser.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mb-4"
            />
          ) : (
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
              {currentUser.name[0]}
            </div>
          )}
          <h2 className="text-2xl font-bold mb-1">{currentUser.name}</h2>
          <p className="text-white/90 mb-1">{currentUser.role}</p>
          <p className="text-white/80 text-sm">{currentUser.company}</p>
        </div>
        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG
            value={`https://netcard.app/u/${currentUser.username}?ref=card`}
            size={80}
            level="M"
          />
        </div>
      </div>

      {currentUser.bio && (
        <p className="text-white/90 text-sm mb-6 leading-relaxed">
          {currentUser.bio}
        </p>
      )}

      <div className="space-y-2">
        {currentUser.links.slice(0, 4).map((link, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm text-white/90"
          >
            {link.type === "email" && <Mail className="w-4 h-4" />}
            {link.type === "phone" && <Phone className="w-4 h-4" />}
            {link.type === "website" && <Globe className="w-4 h-4" />}
            {link.type === "telegram" && <MessageCircle className="w-4 h-4" />}
            <span className="capitalize">{link.type}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/20">
        <p className="text-white/60 text-xs text-center">
          Отсканируйте QR-код для контакта
        </p>
      </div>
    </div>
  );
}
