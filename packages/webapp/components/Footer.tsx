import React from "react";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto"></div>
          <SwitchTheme className={`pointer-events-auto`} />
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="text-center">
              <a href="https://github.com/Ktl-XV/gp-tools" target="_blank" rel="noreferrer" className="link">
                <CodeBracketIcon className="inline-block h-4 w-4" /> Source Code
              </a>
            </div>
            <span>·</span>
            <div className="flex justify-center items-center gap-2">
              <p className="m-0 text-center">Built by</p>
              <a
                className="flex justify-center items-center gap-1"
                href="https://twitter.com/ktl_xv"
                target="_blank"
                rel="noreferrer"
              >
                <span className="link">Ktl_XV</span>
              </a>
            </div>
            <span>·</span>
            <div className="text-center">
              <p>Not affiliated or endorsed by Gnosis Pay, use at your own risk</p>
            </div>
          </div>
        </ul>
      </div>
    </div>
  );
};
