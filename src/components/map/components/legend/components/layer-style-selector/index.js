import React, { useState } from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import { translateText } from "@/utils/lang";
import Icon from "@/components/ui/icon";

import paletteIcon from "@/assets/icons/palette.svg?sprite";
import arrowDownIcon from "@/assets/icons/arrow-down.svg?sprite";

import "./styles.scss";

const backgroundImage = (url) =>
  url ? { backgroundImage: `url("${url.replace(/"/g, "%22")}")` } : undefined;

/**
 * Collapsible list of the styles of a WMS layer, with the legend of each
 * style. Collapsed, it shows the name of the active style.
 */
const LayerStyleSelector = ({ styles, activeStyle, onChange, className }) => {
  const [expanded, setExpanded] = useState(false);

  if (!styles || styles.length < 2) return null;

  const active = styles.find((s) => s.name === activeStyle);

  return (
    <div className={cx("c-layer-style-selector", className)}>
      <button
        type="button"
        className="title"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className="style-icon" icon={paletteIcon} />
        <span>{translateText("Style")}</span>
        {!expanded && active && (
          <span className="active-style" title={active.title}>
            {active.title}
          </span>
        )}
        <Icon
          className={cx("icon-arrow", { "-open": expanded })}
          icon={arrowDownIcon}
        />
      </button>

      {expanded && (
        <ul className="styles">
          {styles.map(({ name, title, legendUrl }) => {
            const isActive = name === activeStyle;

            return (
              <li key={name}>
                <button
                  type="button"
                  className={cx("style", { "-active": isActive })}
                  title={title}
                  aria-pressed={isActive}
                  onClick={() => !isActive && onChange(name)}
                >
                  <span className="name">{title}</span>
                  <span
                    className="thumbnail"
                    style={backgroundImage(legendUrl)}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

LayerStyleSelector.propTypes = {
  styles: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      title: PropTypes.string,
      legendUrl: PropTypes.string,
    })
  ),
  activeStyle: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
};

export default LayerStyleSelector;
