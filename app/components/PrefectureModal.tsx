import React from "react";
import { Form } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";

interface PrefectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefecture: {
    id: number;
    name: string;
    visited: number;
    total: number;
  } | null;
  places: Array<{
    id: number;
    name: string;
    visited: boolean;
  }> | null;
  onToggleVisit: (placeId: number, visited: boolean) => void;
}

const PrefectureModal: React.FC<PrefectureModalProps> = ({
  isOpen,
  onClose,
  prefecture,
  places,
  onToggleVisit,
}) => {
  if (!prefecture) return null;

  const progressPercentage = (prefecture.visited / prefecture.total) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {prefecture.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 進捗情報 */}
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-4">
              訪問済み: {prefecture.visited} / {prefecture.total}
            </p>
            <div className="mx-auto max-w-sm">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                進捗: {Math.round(progressPercentage)}%
              </p>
            </div>
          </div>

          {/* 場所一覧 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">場所一覧</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {places?.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {place.name}
                    </span>
                    {place.visited && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        訪問済み
                      </span>
                    )}
                  </div>

                  <Button
                    variant={place.visited ? "destructive" : "default"}
                    size="sm"
                    onClick={() => onToggleVisit(place.id, place.visited)}
                    className="text-xs"
                  >
                    {place.visited ? "✅ 解除" : "✅ 訪問"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 閉じるボタン */}
          <div className="flex justify-center pt-4">
            <Button onClick={onClose} variant="outline" className="px-8">
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrefectureModal;
