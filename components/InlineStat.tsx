import React, { FC, ReactNode } from "react";
import { Flex, Box, Text, HStack, Tooltip } from "@chakra-ui/react";

import InfoIcon from "components/icons/InfoIcon";

type Props = {
  label: string;
  value: string | number;
  name: string;
  tooltip?: string;
};

const InlineStat: FC<Props> = ({ label, value, name, tooltip }) => {
  return (
    <Box lineHeight="1">
      <HStack>
        <Flex color="brand.200" align="center">
          <Text variant="light" mr="1">
            {label}
          </Text>
          {tooltip && (
            <Tooltip
              label={tooltip}
              placement="top"
              hasArrow
              aria-label="Staking tooltip"
            >
              <Box cursor="pointer" color="brand.200">
                <InfoIcon width="1rem" height="1rem" />
              </Box>
            </Tooltip>
          )}
          <Text variant="light">:</Text>
        </Flex>
        <Text fontWeight="500" fontSize="sm">
          {value} {name}
        </Text>
      </HStack>
    </Box>
  );
};

export default InlineStat;
