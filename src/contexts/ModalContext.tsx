import React, { createContext, useContext, useState, ReactNode } from 'react';

type ModalButton = {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
};

type ModalOptions = {
  title: string;
  message?: string;
  buttons: ModalButton[];
  type?: 'alert' | 'action-sheet';
};

type ModalContextType = {
  isVisible: boolean;
  modalConfig: ModalOptions | null;
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalOptions | null>(null);

  const showModal = (options: ModalOptions) => {
    setModalConfig(options);
    setIsVisible(true);
  };

  const hideModal = () => {
    setIsVisible(false);
    setTimeout(() => {
      setModalConfig(null);
    }, 300);
  };

  return (
    <ModalContext.Provider value={{ isVisible, modalConfig, showModal, hideModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};