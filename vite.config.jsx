import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import React, { useState, useEffect, useContext, createContext } from 'react';


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
