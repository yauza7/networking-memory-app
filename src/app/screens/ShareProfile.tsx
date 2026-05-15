import { currentUser, mockContacts } from "../utils/mockData";
import { Send, Check, X, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export function ShareProfile() {
  const navigate = useNavigate();
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSent, setIsSent] = useState(false);

  const filteredContacts = mockContacts.filter(
    (c) =>
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    setIsSent(true);
    setTimeout(() => {
      navigate("/contacts");
    }, 2000);
  };

  if (isSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Отправлено!</h2>
          <p className="text-muted-foreground">
            Ваша визитка отправлена {selectedContacts.length} контакт
            {selectedContacts.length > 1 ? "ам" : "у"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 text-white p-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Отправить визитку</h1>
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск контактов..."
            className="w-full pl-10 pr-4 py-2.5 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
          />
        </div>

        {/* Selected Count */}
        {selectedContacts.length > 0 && (
          <div className="mt-3 px-3 py-2 bg-white/20 rounded-lg text-sm">
            Выбрано: {selectedContacts.length}
          </div>
        )}
      </div>

      {/* Contacts List */}
      <div className="p-4 space-y-2">
        {filteredContacts.map((contact) => {
          const isSelected = selectedContacts.includes(contact.id);
          return (
            <button
              key={contact.id}
              onClick={() => toggleContact(contact.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-500"
                  : "bg-card border-border hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {contact.user.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold">{contact.user.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {contact.user.role}
                      {contact.user.company && ` • ${contact.user.company}`}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Send Button */}
      {selectedContacts.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t border-border">
          <button
            onClick={handleSend}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:scale-105 transition-transform shadow-lg"
          >
            <Send className="w-5 h-5" />
            Отправить визитку ({selectedContacts.length})
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Нет контактов</h3>
          <p className="text-sm text-muted-foreground">
            Попробуйте изменить поисковый запрос
          </p>
        </div>
      )}
    </div>
  );
}
