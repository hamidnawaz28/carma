import ArrowForward from "../../assets/images/ArrowForward.svg";
import ArrowBackward from "../../assets/images/ArrowBackward.svg";

const Table = ({ heads, rows, page, pages }) => {
  return (
    <div className="container">
      <table>
        <tr>
          {heads.map((el, id) => (
            <th key={id}>
              <div>
                <div>{el.label}</div>
              </div>
            </th>
          ))}
        </tr>
        {rows?.map((row, id) => (
          <tr key={id}>
            {heads.map((head, key) => {
              return <td key={key}>{row[head.key]}</td>;
            })}
          </tr>
        ))}
      </table>
      <div>
        <div>
          <div>
            <img src={ArrowBackward} alt="arrow-backward" />
          </div>
          <div>
            <img src={ArrowForward} alt="arrow-forward" />
          </div>
        </div>
        <div>
          <div>Page: </div>
          <div>{page} </div>
        </div>
        <div>
          <div>Total Pages: </div>
          <div>{pages} </div>
        </div>
      </div>
    </div>
  );
};

export default Table;
