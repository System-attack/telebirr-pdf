import Container from '@bit/opencollective.design-system.components.styled-container';
import StyledLink from '@bit/opencollective.design-system.components.styled-link';
import { H2, P, Span } from '@bit/opencollective.design-system.components.styled-text';
import { chunk, get, max, maxBy, minBy, sumBy } from 'lodash';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Box, Flex } from 'rebass/styled-components';
import PageFormat from '../lib/constants/page-format';
import { formatCurrency } from '../lib/utils';
import CollectiveAddress from './CollectiveAddress';
import ExpenseAttachmentsTable from './ExpenseAttachmentsTable';

const getPageHeight = pageFormat => {
  const dimensions = PageFormat[pageFormat];
  return `${dimensions.page.height}${dimensions.unit}`;
};

/**
 * Chunk attachments, returning less attachments on the first page is we need
 * to keep some space for the header. The number of attachments we show on it depends of
 * the size of the header, that we estimate from the number of lines in the addresses.
 */
const chunkAttachments = expense => {
  const baseNbOnFirstPage = 12;
  const minNbOnFirstPage = 8;
  const attachmentsPerPage = 22;

  // Estimate the space available
  const countLines = str => sumBy(str, c => c === '\n');
  const billFromAddressSize = countLines(get(expense.account, 'location.address', ''));
  const billToAddressSize = countLines(get(expense.payee, 'location.address', ''));
  const maxNbOnFirstPage = max([minNbOnFirstPage, baseNbOnFirstPage - (billFromAddressSize + billToAddressSize)]);

  // If we don't need to put the logo on first page then let's use all the space available
  const attachments = expense.attachments;
  const nbOnFirstPage = attachments.length > baseNbOnFirstPage ? baseNbOnFirstPage : maxNbOnFirstPage;

  return [
    attachments.slice(0, nbOnFirstPage),
    ...chunk(attachments.slice(nbOnFirstPage, attachments.length), attachmentsPerPage),
  ];
};

const ExpenseInvoice = ({ expense, pageFormat }) => {
  if (!expense) {
    return <div>Could not retrieve the information for this expense.</div>;
  }

  const { account, payee } = expense;
  const chunkedAttachments = chunkAttachments(expense);
  const dateFrom = new Date(minBy(expense.attachments, 'incurredAt').incurredAt);
  const dateTo = new Date(maxBy(expense.attachments, 'incurredAt').incurredAt);
  const isSameDay = moment(dateFrom).isSame(dateTo, 'day');
  return (
    <div>
      {chunkedAttachments.map((attachmentsChunk, pageNumber) => (
        <Flex flexDirection="column" key={pageNumber} p={5} css={{ minHeight: getPageHeight(pageFormat) }}>
          {pageNumber === 0 && (
            <Box mb={4}>
              <Flex flexWrap="wrap" alignItems="flex-start">
                <Box mb={3} css={{ flexGrow: 1 }}>
                  <Box my={2}>
                    <H2 mb={1}>
                      <FormattedMessage id="billFrom" defaultMessage="From" />
                    </H2>
                    <StyledLink href={`https://opencollective.com/${payee.slug}`}>
                      <P fontWeight="bold" fontSize="LeadParagraph" color="black.800">
                        {payee.name}
                      </P>
                    </StyledLink>
                    <CollectiveAddress collective={payee} />
                  </Box>
                </Box>
                <Box mt={80} pr={3} css={{ minHeight: 100 }}>
                  <H2 mb={1}>
                    <FormattedMessage id="billTo" defaultMessage="Bill to" />
                  </H2>
                  <StyledLink href={`https://opencollective.com/${account.slug}`}>
                    <P fontWeight="bold" fontSize="LeadParagraph" color="black.800">
                      {account.name}
                    </P>
                  </StyledLink>
                  <Box mb={2}>
                    <CollectiveAddress collective={account} />
                  </Box>
                  <StyledLink href={`https://opencollective.com/${account.slug}`}>
                    https://opencollective.com/{account.slug}
                  </StyledLink>
                </Box>
              </Flex>

              <Box mt={4}>
                <StyledLink href={`https://opencollective.com/${account.slug}/expenses/${expense.legacyId}`}>
                  <H2 mb={1} color="black.900" css={{ textDecoration: 'underline' }}>
                    <FormattedMessage
                      id="Expense.Description"
                      defaultMessage="Expense #{id}: {description}"
                      values={{ id: expense.legacyId, description: expense.description }}
                    />
                  </H2>
                </StyledLink>
                {!isSameDay ? (
                  <FormattedMessage
                    id="dateFromTo"
                    defaultMessage="From {dateFrom, date, long} to {dateTo, date, long}"
                    values={{ dateFrom, dateTo }}
                  />
                ) : (
                  <FormattedMessage
                    id="DateLabel"
                    defaultMessage="Date: {date, date, full}"
                    values={{ date: dateFrom }}
                  />
                )}
              </Box>
            </Box>
          )}
          <Box width={1} css={{ flexGrow: 1 }}>
            <ExpenseAttachmentsTable expense={expense} attachments={attachmentsChunk} />
            {pageNumber === chunkedAttachments.length - 1 && (
              <Box>
                <Flex justifyContent="flex-end" mt={3}>
                  <Container width={0.5} fontSize="Paragraph">
                    <Container
                      display="flex"
                      justifyContent="space-between"
                      px={3}
                      py={2}
                      background="#ebf4ff"
                      fontWeight="bold"
                    >
                      <FormattedMessage id="total" defaultMessage="TOTAL" />
                      <Span>{formatCurrency(expense.amount, expense.currency)}</Span>
                    </Container>
                  </Container>
                </Flex>
                {expense.invoiceInfo && (
                  <Flex justifyContent="flex-end" mt={5}>
                    <P whiteSpace="pre" fontStyle="italic" textAlign="right">
                      {expense.invoiceInfo}
                    </P>
                  </Flex>
                )}
              </Box>
            )}
          </Box>
        </Flex>
      ))}
    </div>
  );
};

ExpenseInvoice.propTypes = {
  pageFormat: PropTypes.oneOf(Object.keys(PageFormat)),
  expense: PropTypes.shape({
    id: PropTypes.string,
    legacyId: PropTypes.number,
    description: PropTypes.string,
    currency: PropTypes.string,
    type: PropTypes.oneOf(['INVOICE', 'RECEIPT']),
    invoiceInfo: PropTypes.string,
    amount: PropTypes.number,
    account: PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      name: PropTypes.string,
      slug: PropTypes.string,
      imageUrl: PropTypes.string,
      location: PropTypes.shape({
        address: PropTypes.string,
        country: PropTypes.string,
      }),
      host: PropTypes.shape({
        id: PropTypes.string,
        type: PropTypes.string,
        name: PropTypes.string,
        slug: PropTypes.string,
        imageUrl: PropTypes.string,
        location: PropTypes.shape({
          address: PropTypes.string,
          country: PropTypes.string,
        }),
      }),
    }),
    payee: PropTypes.shape({
      id: PropTypes.string,
      type: PropTypes.string,
      name: PropTypes.string,
      slug: PropTypes.string,
      imageUrl: PropTypes.string,
      location: PropTypes.shape({
        address: PropTypes.string,
        country: PropTypes.string,
      }),
    }),
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        amount: PropTypes.number,
        description: PropTypes.string,
        incurredAt: PropTypes.string,
        url: PropTypes.string,
      }),
    ),
  }),
};

ExpenseInvoice.defaultProps = {
  pageFormat: 'A4',
};

export default ExpenseInvoice;
